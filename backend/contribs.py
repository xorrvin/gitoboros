import re
import aiohttp
import asyncio
import functools
import operator
from random import randrange
from datetime import datetime, time
from bs4 import BeautifulSoup

URLINFO = "https://api.github.com/users/{}"
URLDATA = "https://github.com/users/{}/contributions?from={}&to={}"
REGEX = re.compile(r"(\d{1,2}) contribution[s]? on ([A-Za-z]{3,12}) (\d{1,2})")
MAX_CONTRIBS = 2**24

class GitHubException(Exception):
    pass

class GitHubUser:
    """
    Retrieves contribution info for a particular username
    """
    _username = None

    def __init__(self, username, *args, **kwargs):
        self._username = username
        self._session = None

    async def get_joindate(self) -> int:
        """
        Get user join date
        """
        async with self._session.get(URLINFO.format(self._username)) as resp:
            obj = await resp.json()

            if resp.ok and resp.status == 200:                
                dt = datetime.fromisoformat(obj["created_at"])

                return dt.year
            else:
                raise GitHubException(f"Cannot get user info: {obj["message"]}")

    async def build_ranges(self) -> list[tuple[int, str, str]]:
        """
        Build yearly ranges from join date till today
        """
        ranges = []
        today = datetime.today()
        thisyear = today.year
        joined = await self.get_joindate()

        for year in range(joined, thisyear):
            ranges.append((year, f"{year}-01-01", f"{year}-12-31"))

        # this year till today
        ranges.append((thisyear, f"{thisyear}-01-01", f"{today.strftime('%Y-%m-%d')}"))

        return ranges

    async def extract_yearly_contribs(self, url: str, year: str | int) -> list[int]:
        """
        Extract user contributions for a particular year
        """
        contribs = []

        async with self._session.get(url) as response:
            # frankly speaking, BeautifulSoup is not needed as regex
            # can skim through page text without any issue; but let's
            # leave it for clarity (and in case GitHub decide to change
            # their contribution rendering)
            text = await response.text()
            page = BeautifulSoup(text, "html.parser")
            tags = page.find_all("tool-tip")

            # iterate tooltips
            for tooltip in tags:
                match = REGEX.match(tooltip.text)

                if match:
                    num_contribs, month, day = match.groups()

                    # %-d is GNU-specific, so parse without it
                    parsed = datetime.strptime(f"{day} {month} {year}", "%d %B %Y")

                    # generate random contributions on that day
                    for _ in range(int(num_contribs)):
                        timestamp = datetime(
                            year=parsed.year,
                            month=parsed.month,
                            day=parsed.day,
                            hour=randrange(0, 24),
                            minute=randrange(0, 60),
                            second=randrange(0, 60),
                        )

                        contribs.append(int(timestamp.timestamp()))

            return contribs

    async def get_contributions(self) -> list[int]:
        """
        Extract all user contributions from registration time till today
        """
        urls = []

        try:
            self._session = aiohttp.ClientSession()

            # create ranges
            ranges = await self.build_ranges()

            # create urls
            for rangevalue in ranges:
                year, begin, end = rangevalue

                urls.append((URLDATA.format(self._username, begin, end), year))

            # go
            tasks = [self.extract_yearly_contribs(url, year) for url, year in urls]
            results = await asyncio.gather(*tasks)

            # item order doesn't really mean much since timestamps are fixed
            return functools.reduce(operator.iconcat, results, [])

        # reraise to extract error later
        except Exception as e:
            raise e

        # always close session
        finally:
            await self._session.close()
