"""
This is a bare minimum Git implementation, loosely based on Ben Hoyt's pygit:
https://benhoyt.com/writings/pygit/

The goal is to have enough structures to hold a file and some commits together on a single branch, nothing more.

Helpful resources:

https://benhoyt.com/writings/pygit
https://github.com/jelmer/dulwich
https://dev.to/calebsander/git-internals-part-1-the-git-object-model-474m
https://github.com/omegaup/githttp
https://www.git-scm.com/docs/http-protocol
https://github.com/dvdotsenko/git_http_backend.py
https://git-scm.com/docs/protocol-v2
"""

import random
import time
import zlib
import struct
import hashlib
import operator

from enum import Enum
from collections import namedtuple

from typing import Sequence, AbstractSet

DEFAULT_BRANCH = "main"
DEFAULT_COMMIT_AUTHOR = "Gitoboros"


class GitError(Exception):
    """
    Git operation error
    """

    pass


class PktLine:
    """
    Encode/decode data according to pkt-line format.
    Reference: https://git-scm.com/docs/protocol-common
    """

    def write(self, data: bytes | str | None) -> bytes:
        """
        Write binary data as pkt-line
        """
        if data is None:
            return b"0000"

        size = len(data) + 4
        header = f"{size:04x}".encode("ascii")

        if size > 0x9999:
            raise GitError("pktline data too big")

        return header + (data.encode("ascii") if isinstance(data, str) else data)

    def parse(self, data: bytes) -> list[str]:
        """
        Read a stream of pkt-line data and return a list of parsed lines
        """
        lines = []
        i = 0
        for _ in range(1000):
            line_length = int(data[i : i + 4], 16)
            line = data[i + 4 : i + line_length]

            # don't append flush pkts
            if line != b"":
                lines.append(line.decode("ascii").replace("\n", ""))

            # flush pkt
            if line_length == 0:
                i += 4
            else:
                i += line_length

            if i >= len(data):
                break

        return lines


class GitObjectType(Enum):
    """
    Supported git object types
    """

    commit = 1
    tree = 2
    blob = 3


class GitObjectStore:
    """
    Git object storage and handling
    """

    _storepacked = False
    _objectsdata = {}
    _packeddata = {}

    def __init__(self, store_packed=False):
        """
        If store_packed is True, compute packed object version on each hashing.
        Final packfile creation will be much faster, but this will use more memory.
        Defaults to False.
        """
        self._storepacked = store_packed

    def hash_object(self, data: bytes, obj_type: str) -> str:
        """
        Compute hash of object data of a given type and write data to the store
        """
        header = f"{obj_type} {len(data)}".encode("ascii")
        full_data = header + b"\x00" + data
        sha1 = hashlib.sha1(full_data).hexdigest()
        compressed = zlib.compress(full_data)
        self._objectsdata[sha1] = compressed

        # compute packed version as well
        if self._storepacked:
            self._packeddata[sha1] = self.encode_pack_object_raw(obj_type, data)

        return sha1

    def read_object(self, sha1: str) -> tuple[str, bytes]:
        """
        Lookup object by its sha1 hash and return obj data
        """
        if sha1 not in self._objectsdata:
            raise GitError("unknown object requested")

        full_data = zlib.decompress(self._objectsdata[sha1])
        nul_index = full_data.index(b"\x00")
        header = full_data[:nul_index]
        obj_type, size_str = header.decode().split()
        size = int(size_str)
        data = full_data[nul_index + 1 :]
        assert size == len(data), "expected size {}, got {} bytes".format(
            size, len(data)
        )

        return (obj_type, data)

    def encode_pack_object_raw(self, obj_type, obj_data) -> bytes:
        """
        Encode raw object data to pack format
        """
        type_num = GitObjectType[obj_type].value
        size = len(obj_data)
        byte = (type_num << 4) | (size & 0x0F)
        size >>= 4
        header = []

        while size:
            header.append(byte | 0x80)
            byte = size & 0x7F
            size >>= 7
        header.append(byte)

        return bytes(header) + zlib.compress(obj_data)

    def encode_pack_object(self, sha1: str) -> bytes:
        """
        Lookup an object and encode it to pack format
        """
        obj_type, data = self.read_object(sha1)

        return self.encode_pack_object_raw(obj_type, data)

    def create_pack(self, objects: Sequence[str]) -> bytes:
        """
        Create and return bytes of the full pack file
        containing all objects in given set of sha hashes.
        """
        header = struct.pack("!4sLL", b"PACK", 2, len(objects))
        body = b"".join(self.encode_pack_object(o) for o in sorted(objects))
        contents = header + body
        sha1 = hashlib.sha1(contents).digest()
        data = contents + sha1

        return data

    def create_pack_fast(self) -> bytes:
        """
        Same as create_pack, but uses all objects and their
        precomputed pack versions. Requires store_packed = True
        to be passed to the class constructor.
        """
        if not self._storepacked:
            raise GitError("create_pack_fast requires store_packed = True")

        obj_keys = self._packeddata.keys()
        header = struct.pack("!4sLL", b"PACK", 2, len(obj_keys))
        body = b"".join(self._packeddata[o] for o in sorted(obj_keys))
        contents = header + body
        sha1 = hashlib.sha1(contents).digest()
        data = contents + sha1

        return data


# data for one entry in the git index (.git/index)
GitIndexEntry = namedtuple(
    "IndexEntry",
    [
        "ctime_s",
        "ctime_n",
        "mtime_s",
        "mtime_n",
        "dev",
        "ino",
        "mode",
        "uid",
        "gid",
        "size",
        "sha1",
        "flags",
        "path",
    ],
)


class GitIndex:
    """
    Index storage and handler
    """

    _indexdata = b""

    def read(self) -> list[GitIndexEntry]:
        """
        Read index data
        """
        if len(self._indexdata) == 0:
            return []

        data = self._indexdata
        digest = hashlib.sha1(data[:-20]).digest()

        if digest != data[-20:]:
            raise GitError("invalid index checksum")

        signature, version, num_entries = struct.unpack("!4sLL", data[:12])

        if signature != b"DIRC":
            raise GitError(f"invalid index signature {signature}")
        if version != 2:
            raise GitError(f"unknown index version {version}")

        i = 0
        entries = []
        entry_data = data[12:-20]

        while i + 62 < len(entry_data):
            fields_end = i + 62
            fields = struct.unpack("!LLLLLLLLLL20sH", entry_data[i:fields_end])
            path_end = entry_data.index(b"\x00", fields_end)
            path = entry_data[fields_end:path_end]
            entry = GitIndexEntry(*(fields + (path.decode(),)))
            entries.append(entry)
            entry_len = ((62 + len(path) + 8) // 8) * 8
            i += entry_len

        assert len(entries) == num_entries

        return entries

    def write(self, entries: Sequence[GitIndexEntry]):
        """
        Write index data
        """
        packed_entries = []

        for entry in entries:
            entry_head = struct.pack(
                "!LLLLLLLLLL20sH",
                entry.ctime_s,
                entry.ctime_n,
                entry.mtime_s,
                entry.mtime_n,
                entry.dev,
                entry.ino,
                entry.mode,
                entry.uid,
                entry.gid,
                entry.size,
                entry.sha1,
                entry.flags,
            )
            path = entry.path.encode()
            length = ((62 + len(path) + 8) // 8) * 8
            packed_entry = entry_head + path + b"\x00" * (length - 62 - len(path))
            packed_entries.append(packed_entry)

        header = struct.pack("!4sLL", b"DIRC", 2, len(entries))
        all_data = header + b"".join(packed_entries)
        digest = hashlib.sha1(all_data).digest()
        self._indexdata = all_data + digest


class GitRepo:
    """
    Main class which represents git repository in memory
    """

    # current HEAD commit
    _current = None
    _objects = None
    _index = None
    _branch = None

    def __init__(self, default_branch="main"):
        self._index = GitIndex()
        self._objects = GitObjectStore()
        self._branch = default_branch

    def get_branch(self) -> str:
        """
        Get current (and only) branch
        """
        return self._branch

    def get_current(self) -> str:
        """
        Get current commit pointing to HEAD
        """
        return self._current

    def get_all_objects(self) -> AbstractSet[str]:
        """
        Retrieve all objects in this repo
        """
        return set(self._objects._objectsdata.keys())

    def create_packfile(self, objects: Sequence[str]) -> bytes:
        return self._objects.create_pack(objects)

    def write_tree(self) -> str:
        """
        Write repository tree from the current index entries and return its hash
        """
        tree_entries = []

        for entry in self._index.read():
            assert (
                "/" not in entry.path
            ), "currently only supports a single, top-level directory"
            mode_path = "{:o} {}".format(entry.mode, entry.path).encode()
            tree_entry = mode_path + b"\x00" + entry.sha1
            tree_entries.append(tree_entry)

        return self._objects.hash_object(b"".join(tree_entries), "tree")

    def add_binary(self, path: str, data: bytes, timestamp: int | None = None):
        """
        Add a file (blob) to the repo, only same directory is supported
        """
        if timestamp is None:
            timestamp = int(time.time())

        entries = self._index.read()
        sha1 = self._objects.hash_object(data, "blob")
        flags = len(path.encode("utf-8"))
        assert flags < (1 << 12)

        # simulate os.stat call:
        # st_ino (filesystem inode) and st_dev (device inode) are good
        # enough to represent a random UNIX system;
        # although many filesystems are using 64bit inode counters now,
        # packing code is using 32bit numbers so stick with it.
        # 33188 == 100644 in octal and represents a regular file
        # with generic 644 permissions. UID/GID of 1000 are often used
        # for local users on Linux. Technically UID/GID 0 (root) could
        # be used here, but noone likes a file committed by root. Right?
        mode = 33188
        uidgid = 1000
        st_ino = random.randrange(0, 2**32 - 1)
        st_dev = 16777221
        entry = GitIndexEntry(
            timestamp,
            0,
            timestamp,
            0,
            st_dev,
            st_ino,
            mode,
            uidgid,
            uidgid,
            len(data),
            bytes.fromhex(sha1),
            flags,
            path,
        )
        entries.append(entry)
        entries.sort(key=operator.attrgetter("path"))
        self._index.write(entries)

    def do_commit(
        self, author: str, email: str, message: str, timestamp: int | None = None
    ) -> str:
        """
        Create a commit with a given data and return its hash. Unfortunately some
        clients cannot parse anything but internal git format, so UNIX timestamp is expected.
        """
        if timestamp is None:
            timestamp = int(time.time())

        tree = self.write_tree()
        parent = self._current
        lines = ["tree " + tree]

        if parent:
            lines.append("parent " + parent)

        lines.append(f"author {author} <{email}> {timestamp} +0000")
        lines.append(f"committer {author} <{email}> {timestamp} +0000")
        lines.append("")
        lines.append(message)
        lines.append("")

        data = "\n".join(lines).encode("utf-8")
        sha1 = self._objects.hash_object(data, "commit")
        self._current = sha1

        return sha1
