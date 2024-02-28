import logging

from typing import Annotated

from fastapi import Path, Request, HTTPException
from fastapi.responses import JSONResponse

from session import SessionStore, SessionError, SESSION_ID_LENGTH


class GitoborosException(HTTPException):
    """
    Custom HTTP exception. Returns detailed error to the user
    """

    def __init__(self, status_code, error_name, error_details):
        self.error_name = error_name
        self.error_details = error_details

        super().__init__(status_code=status_code)


async def gitoboros_exception_handler(request: Request, exc: GitoborosException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_name, "details": exc.error_details},
    )


async def verify_repo_id(
    repo_id: Annotated[
        str, Path(min_length=SESSION_ID_LENGTH, max_length=SESSION_ID_LENGTH)
    ]
):
    """
    Dependency to verify externally provided repo (session) ID
    """
    valid = False
    logger = logging.getLogger("repo_check")

    try:
        session = SessionStore.create_session_from_uri(repo_id)
        check = await session.is_valid()

        if check:
            valid = True

    # invalid ID provided
    except SessionError:
        pass

    if not valid:
        logger.error(f"no such repo: {repo_id}")
        raise HTTPException(404)
