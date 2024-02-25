import uuid
import hashlib
import logging
import asyncio
from contextlib import asynccontextmanager

from redis.asyncio import Redis
from fastapi import FastAPI

# identify each repo by 64 symbols
REPO_KEY_LENGTH = 64

# each session is active for 5 minutes
SESSION_EXPIRY_TIME = 60 * 5

# limit Redis memory to 1 GB
REDIS_MAX_MEMORY = 2**30

logger = logging.getLogger(__name__)

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

        await self.redis.config_set("maxmemory", REDIS_MAX_MEMORY)
        await self.redis.config_rewrite()

    async def teardown(self):
        await self.redis.aclose()

    def create_session(self, handle: str, email: str, branch: str) -> str:
        """
        Creates unique session ID based on combination of
        GitHub handle, email and branch values. Session ID
        is deterministic and depends only on these factors.
        """
        tmp = f"{handle} + {email} ({branch})"
        key = hashlib.blake2b(tmp.encode("ascii")).hexdigest()
        session_id = uuid.uuid5(namespace=self.namespace, name=key)

        return str(session_id)
    
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

    async def set_session_data(self,
        session_id: str,
        total_objects: int,
        latest_object: str,
        packfile: bytes,
    ):
        """
        Store data for a particular session_id as a Redis hash
        """
        await self.redis.hset(session_id, mapping={
            "total_objects": total_objects,
            "latest_object": latest_object,
            "packfile": packfile,

            # this indicates that session has been properly written
            # and didn't crash in the middle of request handling
            "completed": session_id
        })

    async def get_session_data(self, session_id: str):
        """
        Retrieve previously stored session data
        """
        pass

# Essentially a Singleton object, which will be managed by FastAPI
SessionStore = RedisSessionStore()

@asynccontextmanager
async def SessionLifespan(app: FastAPI):
    await SessionStore.init()

    yield

    await SessionStore.teardown()
