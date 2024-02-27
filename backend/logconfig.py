import logging

from copy import copy
from typing import Any, Dict
from datetime import datetime

import click
from uvicorn.config import LOGGING_CONFIG
from uvicorn.logging import ColourizedFormatter, AccessFormatter, DefaultFormatter

from starlette_context import context
from starlette_context.errors import ContextDoesNotExistError

LOG_PREFIX = '%(levelprefix)s %(asctime)s %(name)s '

class CustomFormatter(ColourizedFormatter):
    """
    Use custom log formatter for finer log control
    """
    def formatTime(self, record, datefmt=None):
        return datetime.fromtimestamp(record.created).astimezone().isoformat(timespec='milliseconds')

    def formatMessage(self, record: logging.LogRecord) -> str:
        recordcopy = copy(record)
        request = getattr(recordcopy, "request", None)

        # ideally, session should be managed here as well,
        # but that would require separate handler, which
        # will overwrite the name and thus session will
        # become detached from api/handlers, which will
        # defeat whole purpose of logging it.
        #session = getattr(recordcopy, "session", None)

        # only uvicorn basename is needed
        if recordcopy.name.startswith("uvicorn"):
            recordcopy.name = "uvicorn"

        # align short names
        recordcopy.name = f"{recordcopy.name:<8}"

        if self.use_colors:
            recordcopy.name = click.style(recordcopy.name, fg="cyan")

            if request is not None:
                recordcopy.request = click.style(recordcopy.request, fg="bright_yellow")
            else:
                recordcopy.request = ""

            #if session is not None:
            #    recordcopy.session = click.style(recordcopy.session, fg="yellow")
            #else:
            #    recordcopy.session = ""

        return super().formatMessage(recordcopy)


class RequestFilter(logging.Filter):
    """
    A filter which injects HTTP Request ID in the logs
    """
    def filter(self, record):
        request = None

        try:
            request = context.data["X-Request-ID"][0:8]
        except ContextDoesNotExistError:
            pass

        record.request = request

        return record

class SessionAdapter(logging.LoggerAdapter):
    """
    Create session-specific logger instance. Ideally should be managed
    by CustomFormatter, but for quick logs augmenting msg field is good enough.
    """
    def process(self, msg, kwargs):
        styled = click.style(self.extra['session'], fg="magenta")

        return '%s %s' % (styled, msg), kwargs

class CustomUvicornAccessFormatter(CustomFormatter, AccessFormatter):
    pass

class CustomUvicornDefaultFormatter(CustomFormatter, DefaultFormatter):
    pass

def get_uvicorn_logging_config() -> Dict[str, Any]:
    """
    Update default uvicorn log configuration
    """
    uvicorn_log_config = LOGGING_CONFIG

    # add request filter
    uvicorn_log_config['filters'] = {
        'request': {
            '()': RequestFilter,
        },
    }
    uvicorn_log_config['handlers']['access']['filters'] = ['request']

    # replace existing formatters
    formatters = uvicorn_log_config['formatters']
    
    formatters['default']['()'] = CustomUvicornDefaultFormatter
    formatters['default']['fmt'] = LOG_PREFIX + '%(message)s'

    formatters['access']['()'] = CustomUvicornAccessFormatter
    formatters['access']['fmt'] = LOG_PREFIX + '%(request)s %(client_addr)s - "%(request_line)s" %(status_code)s'
    
    return uvicorn_log_config

def get_generic_logging_config(level = "INFO") -> Dict[str, any]:
    """
    Create dictionary for logging.dictConfig consumption
    """
    config = { 
        'version': 1,
        'disable_existing_loggers': False,
        'filters': {
            'request': {
                '()': RequestFilter,
            },
        },
        'formatters': { 
            'standard': {
                '()': CustomFormatter,
                'format': LOG_PREFIX + '%(request)s %(message)s',
            },
        },
        'handlers': { 
            'default': { 
                'level': level,
                'formatter': 'standard',
                'filters': ['request'],
                'class': 'logging.StreamHandler',
                'stream': 'ext://sys.stdout',  # Default is stderr
            },
        },
        'loggers': { 
            '': {  # root logger
                'handlers': ['default'],
                'level': level,
                'propagate': False
            },
        } 
    }

    return config
