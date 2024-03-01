"""
Implementation of Git "smart" HTTP protocol. Git book documentation can be rather
abstract, so most of it was ironed out by analyzing wireshark logs and inspecting
GIT_TRACE clones. Since GitHub and most providers are using SSL (which's good),
inspecting their traffic requires either mitmproxy or somehing similar. In theory
it's possible, but rather cumbersome in practice. As of today, lots of excellent
alternatives (like Gitea) exist, so spinning one in a local Docker container can
be incredibly helpful; then plain HTTP traffic can be inspected with Wireshark.

One can debug any git conversation like this:

$ GIT_TRACE=2 GIT_CURL_VERBOSE=2 GIT_TRACE_PACK_ACCESS=2 GIT_TRACE_PACKET=2 \
  GIT_TRACE_PACKFILE=2 GIT_TRACE_SETUP=2 GIT_TRACE_SHALLOW=2 \
  git clone http://some.git/repo/address -v -v;

However:
When tracing binary packets (like sideband types and such), git outputs unprintable
bytes in OCTAL encoding (wtf), and everything else in plain ASCII. So stuff can look like

00:11:42.699311 pkt-line.c:80           packet:     sideband< \2Counting objects:  61% (26/42)\15

and here "Counting objects" string is prefixed by 0x02 and terminated with 0x0d (CR, \r)
"""

import asyncio
import logging

from enum import Enum
from typing import Callable

from fastapi import APIRouter, Request, Response, HTTPException, Depends
from fastapi.routing import APIRoute
from fastapi.responses import StreamingResponse

from git import PktLine, GitError
from session import SessionStore, SessionData
from utils import verify_repo_id

logger = logging.getLogger(__name__)


class StreamStop(Enum):
    """
    Sentinel object to indicate stream stop
    """

    STOP = hash(hash)


class GitCapabilities(str, Enum):
    """
    Supported server capabilities.
    Reference: https://git-scm.com/docs/protocol-capabilities
    """

    SideBand = "side-band"
    SideBand64k = "side-band-64k"
    ObjectFormat = "object-format=sha1"
    AllowTipSha1 = "allow-tip-sha1-in-want"
    SymRef = "symref=HEAD:refs/heads/{}"
    NoProgress = "no-progress"
    Agent = "agent=git/fakegit"


class GitSideBandType(Enum):
    """
    Types of sideband protocol packets
    """

    PackData = b"\x01"
    Message = b"\x02"
    Error = b"\x03"


class GitCommandType(str, Enum):
    """
    Supported git operations (only clone/pull)
    """

    UploadPack = "git-upload-pack"


class GitSmartHTTPRequest(Request):
    """
    Validates git client requests
    """

    _pkt = None
    _valid = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self._pkt = PktLine()

        # validate POST request
        if self.method == "POST":
            for command in GitCommandType:
                req = f"application/x-{command.value}-request"
                res = f"application/x-{command.value}-result"

                # this looks like proper git client request
                if (
                    self.headers["content-type"] == req
                    and self.headers["accept"] == res
                ):
                    self._valid = True
                    break

            if not self._valid:
                logger.error(
                    "invalid content-type in POST: ", self.headers["content-type"]
                )

                raise HTTPException(400)


class GitSmartHTTPResponse(Response):
    """
    Base server response class to handle git protocol.
    It sets required headers and media_type
    """

    _cmdname = ""
    _default_headers = {
        "Pragma": "No-Cache",
        "Cache-Control": "No-Cache, Max-Age=0, Must-Revalidate",
        "Expires": "Fri, 01 Jan 1980 00:00:00 GMT",
    }

    def __init__(self, cmdname, *args, **kwargs):
        super().__init__(headers=self._default_headers, *args, **kwargs)

        # format & fix content-type header
        self._cmdname = cmdname
        self.media_type = self.media_type.format(command=self._cmdname)
        self.headers["content-type"] = self.media_type


class GitDiscoveryResponse(GitSmartHTTPResponse):
    """
    Response returned for initial refs discovery request
    """

    media_type = "application/x-{command}-advertisement"


class GitCommandResponse(GitSmartHTTPResponse, StreamingResponse):
    """
    Response returned for refs fetching request
    """

    _queue = None
    media_type = "application/x-{command}-result"

    def __init__(self, queue: asyncio.Queue, *args, **kwargs):
        self._queue = queue

        super().__init__(content=self.generate_stream(), *args, **kwargs)

    async def generate_stream(self, *args, **kwargs):
        """
        Stream queue contents to the consumer
        """
        # that feel when even Guido wonders what's the best approach here...
        # https://discuss.python.org/t/queue-termination/18386/15
        while True:
            data = await self._queue.get()

            if data != StreamStop.STOP:
                yield data
            else:
                break


class GitSmartProtocol:
    """
    This class abstracts all git smart protocol operations
    """

    _pkt = None
    _caps = []
    _refs = set()
    _reader = None
    _writer = None
    _streamable = False
    _cached_request = False
    _max_sideband_size = 0

    def __init__(
        self,
        reader: GitSmartHTTPRequest,
        writer: GitSmartHTTPResponse | asyncio.Queue,
        *args,
        **kwargs,
    ):
        if not isinstance(reader, GitSmartHTTPRequest):
            raise TypeError("reader should be an instance of GitClientRequest class")

        if not isinstance(writer, (GitSmartHTTPResponse, asyncio.Queue)):
            raise TypeError(
                "writer should be an instance of GitSmartHTTPResponse or asyncio.Queue class"
            )

        self._pkt = PktLine()
        self._reader = reader
        self._writer = writer

        if isinstance(writer, asyncio.Queue):
            self._streamable = True

    async def parse_request(self) -> tuple[set, bool]:
        """
        Parse and validate client request, return requested refs and negotiated capabilities.
        Subsequent invocations will be cached
        """
        if self._cached_request:
            return self._refs, self._caps

        refs = set()
        has_done = False
        negotiated_caps = set()
        body = await self._reader.body()

        for line in self._pkt.parse(body):
            if line.startswith("want"):
                data = line.split(" ")
                refs.add(data[1].replace(" ", ""))
                caps = data[1:]

                # determine whether progress should be printed and sideband used;
                # https://git-scm.com/docs/pack-protocol/2.13.7#_packfile_data
                for cap in caps:
                    if cap == GitCapabilities.NoProgress.value:
                        negotiated_caps.add(GitCapabilities.NoProgress)
                    if GitCapabilities.SideBand.value in caps:
                        negotiated_caps.add(GitCapabilities.SideBand)
                        self._max_sideband_size = 999
                    elif GitCapabilities.SideBand64k.value in caps:
                        negotiated_caps.add(GitCapabilities.SideBand64k)
                        self._max_sideband_size = 65519

                # that should be impossible
                if (
                    GitCapabilities.SideBand in caps
                    and GitCapabilities.SideBand64k in caps
                ):
                    logger.error("cannot use two sidebands at once")
                    raise HTTPException(400)

            if line == "done":
                has_done = True

        # malformed request
        if not has_done:
            logger.error("no preliminary request termination")
            raise HTTPException(400)

        # update refs & sideband info
        self._refs = refs
        self._caps = negotiated_caps
        self._cached_request = True

        return refs, negotiated_caps

    async def add_raw(self, data: bytes):
        """
        Write raw data to the output buffer
        """
        if self._streamable:
            await self._writer.put(data)
        else:
            # append to the body and update length headers
            self._writer.body += data
            self._writer.headers["content-length"] = str(len(self._writer.body))

    async def stop_stream(self):
        """
        Indicate that stream has ended
        """
        if self._streamable:
            await self._writer.put(StreamStop.STOP)

    def get_sideband_size(self) -> int:
        """
        Returns maximum sideband packet size
        """
        return self._max_sideband_size

    async def add_line(self, data: str | bytes | None):
        """
        Add pkt-line encoded data to the output buffer
        """
        line = self._pkt.write(data)

        await self.add_raw(line)

    async def add_sideband(self, kind: GitSideBandType, data: bytes | str):
        """
        Add sideband data packet to the output buffer
        """
        if len(data) > self._max_sideband_size:
            raise GitError("sideband data is too large")

        encoded = data if isinstance(data, bytes) else data.encode("ascii")

        # CR ensures that git can use terminal escape codes to format
        # nice progress messages. Newline (LF, \n) is mandatory to
        # print a distinct line which will not be overwritten. Internally,
        # git breaks sideband message by either of the two symbols.
        trailer = b"\r" if kind == GitSideBandType.Message else b""

        await self.add_line(kind.value + encoded + trailer)


async def pack_and_sideband_handler(data: SessionData, proto: GitSmartProtocol):
    """
    Main function to format sideband messages and send a prepared packfile
    """
    # identify requested capabilities
    _, caps = await proto.parse_request()
    has_sideband = False
    has_progress = True
    has_fancy = True
    total = data.total_objects

    if GitCapabilities.SideBand in caps or GitCapabilities.SideBand64k in caps:
        has_sideband = True
        logger.info("enabling sideband channel")

    if GitCapabilities.NoProgress in caps:
        has_progress = False
        logger.info("no-progress is requested, no status output will be done")

    # send initial NAK
    await proto.add_line("NAK\n")

    # emulate real git
    if has_sideband and has_progress:
        messages = [
            "Thanks for using Gitoboros.",
            "Please don't try to impersonate other people.",
        ]

        for message in messages:
            for i in range(0, len(message) + 1):
                await proto.add_sideband(GitSideBandType.Message, message[0:i])
                await asyncio.sleep(0.05)

            await proto.add_sideband(GitSideBandType.Message, "\n")

        await proto.add_sideband(
            GitSideBandType.Message, f"Enumerating objects: {total}, done.\n"
        )

        step = int(total / 100) + 1

        # emulate real git even harder
        for i in range(0, total + 1, step):
            percent = int(i / total * 100)

            await proto.add_sideband(
                GitSideBandType.Message,
                f"Counting objects:  {percent}% ({i}/{total})",
            )

            # this does depend on the final connection latency
            # and may need some adjustment in the future
            await asyncio.sleep(0.01)

    # in sideband mode, packfile is chunked and interleaved with sideband messages
    # https://git-scm.com/docs/pack-protocol/2.13.7#_packfile_data
    if has_sideband:
        i = 0
        size = len(data.packfile)
        chunk_size = proto.get_sideband_size() // 2

        for i in range(0, size, chunk_size):
            chunk = data.packfile[i : i + chunk_size]
            await proto.add_sideband(GitSideBandType.PackData, chunk)

        # final sideband message
        if has_progress:
            await proto.add_sideband(
                GitSideBandType.Message,
                f"Total {total} (delta 0), reused 0 (delta 0), pack-reused 0\n",
            )
    else:
        # if there's no sideband, packfile is sent raw (why...)
        await proto.add_raw(data.packfile)

    # sideband requires explicit flush packet
    if has_sideband:
        await proto.add_line(None)

    await proto.stop_stream()


class GitClientRoute(APIRoute):
    """
    Custom route class to wrap client requests and validate them
    """

    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            request = GitSmartHTTPRequest(request.scope, request.receive)
            return await original_route_handler(request)

        return custom_route_handler


# create git router
GitRouter = APIRouter(
    prefix="/repo/{repo_id}",
    dependencies=[Depends(verify_repo_id)],
    include_in_schema=True,
)

# wrap all client requests into this
GitRouter.route_class = GitClientRoute


@GitRouter.get("/info/refs")
async def discovery_handler(
    repo_id: str, service: GitCommandType, request: GitSmartHTTPRequest
):
    """
    Handle initial discovery request from a client
    """
    response = GitDiscoveryResponse(service.value)
    proto = GitSmartProtocol(reader=request, writer=response)

    caps = []
    session = SessionStore.create_session_from_uri(repo_id)
    data = await session.get_data()

    # get some git params
    head = data.latest_object
    branch = data.branch

    # prepare caps array
    for cap in GitCapabilities:
        value = cap.value

        # update branch in symref
        if cap == GitCapabilities.SymRef:
            value = value.format(branch)

        caps.append(value)

    # set service name
    await proto.add_line(f"# service={service.value}\n")
    await proto.add_line(None)

    # latest ref and caps
    await proto.add_line(
        f"{head} HEAD".encode("ascii")
        + b"\x00"
        + str(" ").join(caps).encode("ascii")
        + b"\n"
    )
    await proto.add_line(f"{head} refs/heads/{branch}\n")
    await proto.add_line(None)

    return response


@GitRouter.post("/{command}")
async def refs_handler(
    repo_id: str, command: GitCommandType, request: GitSmartHTTPRequest
):
    """
    Handle pack downloading and sideband channel
    """
    # prepare response and initialize proto
    queue = asyncio.Queue()
    response = GitCommandResponse(queue=queue, cmdname=command.value)
    proto = GitSmartProtocol(reader=request, writer=queue)

    # parse initial request here, since it won't be easy to raise an exception later
    # NB: repo_id is a valid session_id, which was already verified in router deps
    session = SessionStore.create_session_from_uri(repo_id)
    data = await session.get_data()
    refs, _ = await proto.parse_request()

    if len(refs) == 0:
        logger.error("no refs specified")
        raise HTTPException(400)

    # in theory, a graph walking is required
    # to determine exact objects which are needed
    # by a particular ref that a client has requested.
    # in practice, this code supports only full clone,
    # so all objects will be packed and returned.
    if not data.latest_object in refs:
        logger.error(f"unknown ref requested: {data.latest_object}")
        raise HTTPException(400)

    # request looks valid, schedule actual handler
    # NB: not sure if fastapi/starlette BackgroundTasks should
    # be used here, but they do not seem to work. At least
    # asyncio picks up the function right away
    asyncio.create_task(pack_and_sideband_handler(data, proto))

    # return early
    return response
