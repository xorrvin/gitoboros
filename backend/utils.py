from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

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
