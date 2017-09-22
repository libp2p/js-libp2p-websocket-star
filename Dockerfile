FROM node:8
COPY . /src
WORKDIR /src
RUN npm i --production
CMD ["npm", "start"]
EXPOSE 9090
