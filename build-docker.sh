#!/bin/bash
./clean-disque.sh
docker compose build --no-cache
docker compose up -d
