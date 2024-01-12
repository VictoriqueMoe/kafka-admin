## Kafka-Admin

This is an application that allows you to subscribe to multiple kafka topics and see in real time the data going to the
topics

It also allows you to publish messages on the topics.

Unlike other tools, this does not upset the offset of the topics in the cluster, so it acts more like a proxy between a
topic and a Websocket

## Getting started

> **Important!** this requires Node >= 14, Express >= 4 and TypeScript >= 4.

`.env` file must be created for this application to work. rename `.envExample` to `.env` and fill out the SMTP info.

```batch
# install dependencies
    npm install

# run for dev
    npm run start

# build for production
# create a folder named 'dist'
    npm run build
    npm run start:prod
```

Then navigate to `localhost:8000`

## Docker

```
# build docker image
docker compose build

# start docker image
docker compose up
```

## Barrelsby

This project uses [barrelsby](https://www.npmjs.com/package/barrelsby) to generate index files to import the
controllers.

Edit `.barrelsby.json` to customize it:

```json
{
  "directory": [
    "./src/controllers/rest",
    "./src/controllers/pages"
  ],
  "exclude": [
    "__mock__",
    "__mocks__",
    ".spec.ts"
  ],
  "delete": true
}
```
