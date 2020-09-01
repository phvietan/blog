FROM node:latest

ARG WORK_DIR
ARG APP_PORT

EXPOSE $APP_PORT
WORKDIR $WORK_DIR

COPY . .
RUN npm install

CMD [ "npm", "start" ]