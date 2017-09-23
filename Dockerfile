FROM node:8
RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 && chmod +x /usr/local/bin/dumb-init
COPY . /app
WORKDIR /app
RUN npm i --production
ENTRYPOINT ["/usr/local/bin/dumb-init", "node", "src/bin.js"]
EXPOSE 9090
