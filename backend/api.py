import logging

from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel, Field, EmailStr

from contribs import GitHubUser, MAX_CONTRIBS
from git import GitRepo
from utils import GitoborosException
from session import SessionStore, SessionData

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
    Migration result. Should contain a successful session_id, which represents new repo.
    """
    session_id: str

class RemoveSessionRequest(BaseModel):
    """
    Session deletion request
    """
    session_id: str


MainAPIRouter = APIRouter(prefix="/migrate")

@MainAPIRouter.post("/")
async def start_migration_handler(migration: MigrationRequest) -> MigrationResponse:
    try:
        email = migration.email
        branch = "main" if migration.branch is None else migration.branch
        username = migration.handle
        session_id = await SessionStore.create_session(username, email, branch)

        logging.info(f"Got params: {migration}")
        logging.info(f"Got session: {session_id}")

        # check for previously made session...
        valid_session = await SessionStore.has_session(session_id)

        if valid_session:
            logging.info("Reusing existing session")
        else:
            logging.info("Getting contributions for a user...")

            repo = GitRepo(branch)
            user = GitHubUser(username)

            contribs = await user.get_contributions()

            logging.info(f"{len(contribs)} contributions found")
            logging.info("Transferring contribs to a git repo...")

            # 10MB packed for ~30K commits
            for i, ts in enumerate(contribs):
                repo.do_commit("Gitoboros", email, f"Contribution #{i}", ts)

            repo.add_binary("README", b"Hello, world!\n")
            repo.do_commit("Gitoboros", email, "Added readme")

            # count all objects and create packfile
            all_objects = repo.get_all_objects()
            packfile = repo.create_packfile(all_objects)

            # store everything
            session = SessionData(
                total_objects=len(all_objects),
                latest_object=repo.get_current(),
                packfile=packfile,
                completed=session_id
            )
            await SessionStore.set_session_data(session_id, session)

        # extend session
        await SessionStore.extend_session(session_id)

        return MigrationResponse(session_id=session_id)

    # pretty format and raise the error
    except Exception as e:
        name = type(e).__qualname__
        value = str(e)

        logging.exception(e)
        raise GitoborosException(400, name, value)

@MainAPIRouter.delete("/{repo_id}")
def delete_migration_handler():
    pass

# POST /start -> session_id

# PUT /migrate/{session_id}
# DELETE /migrate/{session_id}

