#!/bin/bash

if [[ $1 == "cert" ]]
then
    openssl req -x509 -nodes -newkey rsa:4096 -keyout nginx/nginx-selfsigned.key -out nginx/nginx-selfsigned.crt -days 365
    openssl dhparam -out nginx/dhparam.pem 2048
fi


if [[ $1 == "run" ]]
then
    sudo chown -R $USER .

    docker-compose down

    docker-compose up --build -d
fi

