import os
import logging
import datetime

from typing import Annotated

from jinja2 import Template
from fastapi import Path, Request, HTTPException
from fastapi.responses import JSONResponse

from session import SessionStore, SessionError, SESSION_ID_LENGTH

TEMPLATE_NAME = "readme.md.jinja2"


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


def render_readme(account, branch):
    current = os.path.dirname(__file__)
    utcnow = datetime.datetime.utcnow()
    rfc2822 = utcnow.strftime("%a, %d %b %Y %H:%m:%S GMT")

    with open(os.path.join(current, TEMPLATE_NAME)) as file:
        template = Template(file.read())

    return template.render(account=account, branch=branch, timestamp=rfc2822).encode("ascii")
