import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from git import GitRepo
from session import SessionLifespan, SessionStore
from http_proto import GitRouter
from contribs import GitHubUser, MAX_CONTRIBS

from api import MainAPIRouter

from utils import GitoborosException, gitoboros_exception_handler

logging.basicConfig(level=logging.INFO)

app = FastAPI(lifespan = SessionLifespan)
logger = logging.getLogger("uvicorn.access")



origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(GitoborosException, gitoboros_exception_handler)

async def main_init():
    #


    logging.info("initialization completed")

# https://www.uvicorn.org/#config-and-server-instances
asyncio.create_task(main_init())

app.include_router(MainAPIRouter)
app.include_router(GitRouter)
