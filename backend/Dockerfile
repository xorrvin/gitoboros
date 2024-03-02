FROM alpine:latest

RUN apk update && apk add python3 py3-pip

# create venv and default to it
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# upgrade pip and proceed
RUN pip install --upgrade pip
ADD . /app
RUN pip install -r /app/requirements.txt

CMD [ "python3", "/app/main.py" ]
