import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from git import GitRepo
from session import SessionLifespan, SessionStore
from http_proto import GitRouter
from contribs import GitHubUser, MAX_CONTRIBS

logging.basicConfig(level=logging.INFO)

app = FastAPI(lifespan = SessionLifespan)
logger = logging.getLogger("uvicorn.access")




# POST /start -> session_id

# PUT /migrate/{session_id}
# DELETE /migrate/{session_id}

class MigrationRequest(BaseModel):
    username: str
    branch: str
    email: str

class MigrationResponse(BaseModel):
    session_id: str

class RemoveSessionRequest(BaseModel):
    session_id: str

async def main_init():
    #
    logging.info("getting contribs for a user...")


    repo = GitRepo()

    await SessionStore.create("testrepo", repo)

    logging.info("initialization completed")

# https://www.uvicorn.org/#config-and-server-instances
asyncio.create_task(main_init())


# @app.post("/migrate")
app.include_router(GitRouter)
