FROM node:latest

WORKDIR /app

COPY . .

RUN apt install git

RUN git checkout nitro-faucet

RUN yarn install

ENTRYPOINT ["yarn"]