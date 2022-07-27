FROM node:16

RUN mkdir /spotify-helper

ADD . /spotify-helper

WORKDIR /spotify-helper

RUN npm i

EXPOSE 5500

CMD ["node", "index.js"]