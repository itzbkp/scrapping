FROM node:12

RUN apt-get update
RUN apt-get install -y wget gnupg ca-certificates vim
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
RUN apt-get update
RUN apt-get install -y google-chrome-stable
RUN rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . .
COPY Reset ./Scrapping

RUN npm i
RUN npm i http-server pm2 -g