"""
Frontend-facing API implementation. Manages user sessions and validates input.
"""

import asyncio
import logging

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field, EmailStr

from git import GitRepo, DEFAULT_BRANCH, DEFAULT_COMMIT_AUTHOR
from utils import GitoborosException
from contribs import GitHubUser
from session import SessionStore, SessionData, SESSION_EXPIRY_TIME, SESSION_WAIT_TIMEOUT

logger = logging.getLogger(__name__)


class MigrationRequest(BaseModel):
    """
    Migration request. GitHub username and email are required.
    If branch name is not provided, it will be defaulted to "main".
    """

    email: EmailStr
    handle: str = Field(max_length=39, pattern=r"[A-Za-z0-9\-]")
    branch: str = Field(max_length=64, pattern=r"[0-9a-zA-Z-/\\\.]", default=None)


class MigrationResponse(BaseModel):
    """
    Migration result.
    session_id is a session ID, which represents new repo.
    session_ttl is time in seconds this repo will be available.
    """

    repo_id: str
    repo_ttl: int


class RemoveSessionRequest(BaseModel):
    """
    Session deletion request
    """

    session_id: str


MainAPIRouter = APIRouter(prefix="/api")


@MainAPIRouter.get("/hello")
def read_main(request: Request):
    return {"message": "Hello World", "root_path": request.scope.get("root_path")}


@MainAPIRouter.post("/migrate")
async def start_migration_handler(migration: MigrationRequest) -> MigrationResponse:
    """
    This endpoint will accept migration request from the user
    """
    try:
        email = migration.email
        branch = DEFAULT_BRANCH if migration.branch is None else migration.branch
        username = migration.handle

        # create session
        session = await SessionStore.create_session_from_data(username, email, branch)
        slogger = session.create_logger(logger)

        slogger.info("session created")

        # check for previously made session...
        valid_session = await session.is_valid()

        # maybe session wasn't finalized yet?..
        opened_session = await session.is_opened()

        if valid_session:
            slogger.info("reusing existing session")
        elif opened_session:
            slogger.info(
                "session has been already opened, waiting for the completion..."
            )

            async with asyncio.timeout(SESSION_WAIT_TIMEOUT):
                has_closed = False

                while not has_closed:
                    has_closed = await session.is_valid()

                    await asyncio.sleep(0.1)

            slogger.info("parallel session completed, reusing the result")
        else:
            repo = GitRepo(branch)
            user = GitHubUser(username)

            slogger.info("opening session")

            # no context manager here, since explicit closing is required
            await session.open()

            logging.info("Getting contributions for a user...")

            contribs = await user.get_contributions()

            logging.info(f"{len(contribs)} contributions found")
            logging.info("Transferring contribs to a git repo...")

            # 10MB packed for ~30K commits
            for i, ts in enumerate(contribs):
                repo.do_commit(DEFAULT_COMMIT_AUTHOR, email, f"Contribution #{i}", ts)

            repo.add_binary("README", b"Hello, world!\n")
            repo.do_commit(DEFAULT_COMMIT_AUTHOR, email, "Added readme")

            # count all objects and create packfile
            all_objects = repo.get_all_objects()
            packfile = repo.create_packfile(all_objects)

            # store everything
            data = SessionData(
                total_objects=len(all_objects),
                latest_object=repo.get_current(),
                packfile=packfile,
            )
            await session.set_data(data)

            slogger.info("closing session")

            await session.close()

        # once valid session is requested, extend its expiration time
        await session.extend()

        return MigrationResponse(repo_id=session.as_uri(), repo_ttl=SESSION_EXPIRY_TIME)

    # pretty format and raise the error
    except Exception as e:
        name = type(e).__qualname__
        value = str(e)

        logger.exception(e)

        raise GitoborosException(400, name, value)
