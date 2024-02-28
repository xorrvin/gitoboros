"""
Redis session management
"""

import os
import uuid
import base58
import base64
import hashlib
import logging

from enum import Enum
from typing import Optional
from dataclasses import dataclass
from contextlib import asynccontextmanager

from redis.asyncio import Redis
from fastapi import FastAPI

from logconfig import SessionAdapter

# each session is encoded to URI of this size
SESSION_ID_LENGTH = 22

# each session is active for 5 minutes
SESSION_EXPIRY_TIME = 60 * 5

# when parallel session has been already opened,
# wait AT MOST this time in seconds for
# its completion
SESSION_WAIT_TIMEOUT = 10

logger = logging.getLogger(__name__)


def encode_session_id(session_id: str):
    """
    Encode internal UUID-based session ID to base64 string
    """


def decode_session_id(s) -> uuid.UUID:
    """
    Decode externally provided session ID to UUID
    """


class SessionState(Enum):
    """
    Session state status. Once request is received, session
    is set to opened state. After packfile is written, session
    is marked as closed.
    """

    opened = "SESSION_OPENED"
    closed = "SESSION_CLOSED"


@dataclass
class SessionData:
    """
    Represents particular session data. Will be stored as a hash in Redis
    """

    total_objects: int
    latest_object: str
    packfile: bytes

    # state will be explicitly managed separately,
    # and branch value is not mandatory (defaults to "main")
    state: Optional[str] = None
    branch: Optional[str] = None


class SessionError(Exception):
    pass


class Session:
    redis = None
    namespace = None
    identifier = None

    def __init__(self, redis: Redis, *args, **kwargs):
        """
        Initializes Session object and stores Redis handle
        """
        # ideally, for additional security, namespace should be
        # provided externally and shared by all workers.
        # SESSION_NAMESPACE=uuid.uuid4()
        namespace = os.environ.get("SESSION_NAMESPACE", uuid.NAMESPACE_URL)

        self.redis = redis
        self.namespace = namespace

    def get_id(self) -> str:
        """
        Get internal UUID as string
        """
        return str(self.identifier)

    async def make_from_data(self, handle: str, email: str, branch: str):
        """
        Create deterministic session ID based on combination of
        GitHub handle, email and branch values.
        """

        tmp = f"{handle} + {email} ({branch})"
        key = hashlib.blake2b(tmp.encode("ascii")).hexdigest()

        self.identifier = uuid.uuid5(namespace=self.namespace, name=key)

        # save branch
        await self.redis.hset(self.get_id(), "branch", branch)

    def make_from_uri(self, uri: str):
        """
        Create session ID from URI provided by the user
        """
        decoded = base58.b58decode(uri)

        if len(decoded) != 16:
            raise SessionError("invalid session identifier")

        self.identifier = uuid.UUID(bytes=decoded)

    def as_uri(self) -> str:
        """
        Convert session ID to URI format for external distribution
        """
        return base58.b58encode(self.identifier.bytes).decode("ascii")

    async def open(self):
        """
        Open session
        """
        await self.redis.hset(self.get_id(), "state", SessionState.opened.value)

    async def close(self):
        """
        Close session
        """
        await self.redis.hset(self.get_id(), "state", SessionState.closed.value)

    async def is_opened(self):
        """
        Checks whether session has just been opened
        """
        opened = await self.redis.hget(self.get_id(), "state")

        return opened == SessionState.opened.value

    async def is_valid(self):
        """
        Checks whether session already exists and is valid (closed)
        """
        state = await self.redis.hget(self.get_id(), "state")

        return state == SessionState.closed.value

    async def extend(self):
        """
        Set expiration time for a session
        """
        await self.redis.expire(self.get_id(), SESSION_EXPIRY_TIME)

    async def set_data(self, data: SessionData):
        """
        Store data for this session as a Redis hash object
        """
        await self.redis.hset(
            self.get_id(),
            mapping={
                "total_objects": str(data.total_objects),
                "latest_object": data.latest_object,
                # since decode_responses is passed to Redis, it will
                # try to decode packfile upon accessing session data
                # and will fail, so resort to this. Another (faster)
                # option is to pass decode_responses = False and
                # store bytes directly, but it will require casting
                # all other strings from bytes and vice versa.
                "packfile": base64.b64encode(data.packfile),
            },
        )

    async def get_data(self):
        """
        Retrieve previously stored session data
        """
        data = await self.redis.hgetall(self.get_id())

        return SessionData(
            total_objects=int(data["total_objects"]),
            latest_object=data["latest_object"],
            packfile=base64.b64decode(data["packfile"]),
        )

    def create_logger(self, logger: logging.Logger):
        """
        Create session-specific logger instance
        """
        return SessionAdapter(logger, {"session": self.identifier.hex[0:8]})


class RedisSessionStore:
    """
    Wrapper over Redis with extra logic for ID management
    """

    def __init__(self, *args, **kwargs):
        self.redis = None

    async def init(self):
        """
        Initialize Redis connection
        """
        host = os.environ.get("REDIS_HOST", "localhost")
        port = int(os.environ.get("REDIS_PORT", 6379))

        self.redis = Redis(host=host, port=port, decode_responses=True)

        await self.redis.ping()

    async def teardown(self):
        """
        Close Redis connection
        """
        await self.redis.aclose()

    async def create_session_from_data(self, handle: str, email: str, branch: str):
        """
        Creates unique Session object from user-provided data.
        """
        session = Session(redis=self.redis)

        await session.make_from_data(handle, email, branch)

        return session

    def create_session_from_uri(self, uri: str):
        """
        Creates Session object from user-provided URI.
        """
        session = Session(redis=self.redis)

        session.make_from_uri(uri)

        return session


# Essentially a Singleton object, which will be managed by FastAPI
SessionStore = RedisSessionStore()


@asynccontextmanager
async def SessionLifespan(app: FastAPI):
    await SessionStore.init()

    yield

    await SessionStore.teardown()
