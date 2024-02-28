FROM alpine:latest

RUN apk update && apk add python3 py3-pip
ADD . /app
RUN python3 -m pip install --upgrade pip
RUN pip install -r /app/requirements.txt

CMD [ "python3", "/app/main.py" ]
