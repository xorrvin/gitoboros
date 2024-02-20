import sys

from fastapi import APIRouter, Response, HTTPException

from pydantic import BaseModel, Field, EmailStr

from contribs import GitHubUser, MAX_CONTRIBS

from utils import GitoborosException


class MigrationRequest(BaseModel):
    """
    Migration request. GitHub username and email are required.
    If branch name is not provided, it will be defaulted to "main".
    """
    email: EmailStr
    handle: str = Field(max_length=39, pattern=r"[A-Za-z0-9\-]")
    branch: str | None = None #Field(max_length=64, pattern=r"[0-9a-zA-Z-/\\\.]")

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
        user = GitHubUser(migration.handle)
        contribs = await user.get_contributions()

        return MigrationResponse(session_id=f"Got {len(contribs)} for {migration.handle}")

    # pretty format and raise the error
    except Exception as e:
        name = type(e).__qualname__
        value = str(e)

        raise GitoborosException(400, name, value)

@MainAPIRouter.delete("/{repo_id}")
def delete_migration_handler():
    pass

# POST /start -> session_id

# PUT /migrate/{session_id}
# DELETE /migrate/{session_id}

