import os
import asyncio
import logging
import logging.config

import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette_context import plugins
from starlette_context.middleware import RawContextMiddleware

from api import MainAPIRouter
from smart_proto import GitRouter
from session import SessionLifespan

from utils import GitoborosException, gitoboros_exception_handler
from logconfig import get_generic_logging_config, get_uvicorn_logging_config

# create app
app = FastAPI(lifespan=SessionLifespan)

# setup CORS; wildcard here since proper
# filtering will be done by nginx proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# identify every incoming request
app.add_middleware(RawContextMiddleware, plugins=(plugins.RequestIdPlugin(),))

# return extended error info
app.add_exception_handler(GitoborosException, gitoboros_exception_handler)

# main handlers
app.include_router(MainAPIRouter)
app.include_router(GitRouter)


async def main_init():
    port = int(os.environ.get("HTTP_PORT", 8000))
    host = os.environ.get("HTTP_HOST", "localhost")
    workers = int(os.environ.get("HTTP_WORKERS", 2))

    # update generic logging config
    logging.config.dictConfig(get_generic_logging_config())

    # https://www.uvicorn.org/#config-and-server-instances
    config = uvicorn.Config(
        app=app,
        port=port,
        host=host,
        workers=workers,
        proxy_headers=True,
        log_config=get_uvicorn_logging_config(),
    )
    server = uvicorn.Server(config)

    await server.serve()


if __name__ == "__main__":
    asyncio.run(main_init())
