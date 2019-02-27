#! /bin/sh

if [ ! -d ./dist/Migrations ]; then
    mkdir -p ./dist/Migrations;
fi


cp -r ./src/Migrations/stubs/ ./dist/Migrations/
