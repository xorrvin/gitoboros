from asyncio import Lock
from contextlib import asynccontextmanager
from fastapi import FastAPI

# identify each repo by 64 symbols
REPO_KEY_LENGTH = 64

# run on redis init
# CONFIG SET maxmemory <sane value>, 
# followed by a CONFIG REWRITE

class WrappedStore:
    def __init__(self, *args, **kwargs):
        self._store = {}
        self._lock = Lock()
    
    async def get(self, key: str):
        async with self._lock:
            return self._store[key]

    async def has(self, key: str):
        async with self._lock:
            return key in self._store
    
    async def create(self, key: str, value):
        async with self._lock:
            self._store[key] = value

    async def remove(self, key: str):
        async with self._lock:
            del self._store[key]

# Essentially a Singleton object, which will be managed by FastAPI
SessionStore = WrappedStore()

@asynccontextmanager
async def SessionLifespan(app: FastAPI):
    SessionStore = WrappedStore()

    yield

    # cleanup
