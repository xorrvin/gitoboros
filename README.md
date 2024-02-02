# gitoboros

Git + Ouroboros: easily migrate your GitHub contributions!

[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/badges/StandWithUkraine.svg)](https://stand-with-ukraine.pp.ua)

# Demo



# Idea

This project has started as a possible solution for [this issue](https://github.com/orgs/community/discussions/23075) and was partly inspired by such awesome projects as https://github.com/avinassh/rockstar and https://github.com/ihabunek/github-vanity.

# How does it work

GitHub calculates your contributions from your commit activity and some [other factors](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile). Given that one can create a commit with a specific date and email, that's enough for GitHub to count as a contribution. So, if the target profile is public, contributions can be extracted from it and transferred to a separate repo as individual commits with specific dates.

# Ethical question

Technically speaking, nothing stops you from cloning all activity of [Linus Torvalds](https://github.com/torvalds) and making your contribution panel emerald green; but that's all you'll get. You won't become an amazing coder in a minute, no matter how hard you try. Moreover, fully filled contributions panel with no real evidence (all public contributions are traceable) will indicate your fraudulent motives to a sharp-eyed reader.

On the other hand, if you're concerned about authenticity of your work, you may want to look into [signing your commits](https://withblue.ink/2020/05/17/how-and-why-to-sign-git-commits.html).


# Running

You're absolutely welcome to try this locally. You'll need Docker and ~1.5 GBs of free RAM in default config (Redis is used as a session storage and has 1GB of RAM allocated to it)

```
docker-compose -f gitoboros-compose.yaml build
docker compose -f gitoboros-compose.yaml up
```

# License

This project is licensed under the conditions of Apache 2.0 License.

Copyright 2024 xorrvin <xorrvin@pm.me>
