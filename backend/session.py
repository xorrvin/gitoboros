import uuid
import hashlib
import logging
import base64

from typing import Optional
from dataclasses import dataclass
from contextlib import asynccontextmanager

from redis.asyncio import Redis
from fastapi import FastAPI

# identify each repo by 64 symbols
REPO_KEY_LENGTH = 64

# each session is active for 5 minutes
SESSION_EXPIRY_TIME = 60 * 5

logger = logging.getLogger(__name__)

@dataclass
class SessionData:
    """
    Represents particular session data. Will be stored as a hash in Redis
    """
    total_objects: int
    latest_object: str
    packfile: bytes
    completed: str
    branch: Optional[str] = None

class SessionException(Exception):
    pass

class RedisSessionStore:
    """
    Wrapper over Redis with extra logic for ID management
    """
    def __init__(self, *args, **kwargs):
        self.redis = None

        # not sure if this will be shared by workers, so
        # use static hardcoded value for now
        self.namespace = uuid.NAMESPACE_URL #uuid.uuid4()

    async def init(self):
        self.redis = Redis(host='localhost', port=6379, decode_responses=True)

        await self.redis.ping()

    async def teardown(self):
        await self.redis.aclose()

    async def create_session(self, handle: str, email: str, branch: str) -> str:
        """
        Creates unique session ID based on combination of
        GitHub handle, email and branch values. Session ID
        is deterministic and depends only on these factors.
        Name of the branch is going to be saved as initial
        session info.
        """
        tmp = f"{handle} + {email} ({branch})"
        key = hashlib.blake2b(tmp.encode("ascii")).hexdigest()
        session_id = str(uuid.uuid5(namespace=self.namespace, name=key))

        await self.redis.hset(session_id, "branch", branch)

        return session_id
    
    async def has_session(self, session_id: str):
        """
        Checks whether session already exists and is valid
        """
        completed = await self.redis.hget(session_id, "completed")

        return completed == session_id

    async def extend_session(self, session_id: str):
        """
        Set expiration time for a session
        """
        await self.redis.expire(session_id, SESSION_EXPIRY_TIME)

    async def set_session_data(self, session_id: str, session: SessionData):
        """
        Store data for a particular session_id as a Redis hash
        """
        await self.redis.hset(session_id, mapping={
            "total_objects": session.total_objects,
            "latest_object": session.latest_object,

            # since decode_responses is passed to Redis, it will
            # try to decode packfile upon accessing session data
            # and will fail, so resort to this
            "packfile": base64.b64encode(session.packfile),

            # this indicates that session has been properly written
            # and didn't crash in the middle of request handling
            "completed": session_id
        })

    async def get_session_data(self, session_id: str):
        """
        Retrieve previously stored session data
        """

        session = await self.redis.hgetall(session_id)

        return SessionData(
            total_objects=int(session["total_objects"]),
            latest_object=session["latest_object"],
            packfile=base64.b64decode(session["packfile"]),
            branch=session["branch"],
            completed=session["completed"]
        )

# Essentially a Singleton object, which will be managed by FastAPI
SessionStore = RedisSessionStore()

@asynccontextmanager
async def SessionLifespan(app: FastAPI):
    await SessionStore.init()

    yield

    await SessionStore.teardown()
