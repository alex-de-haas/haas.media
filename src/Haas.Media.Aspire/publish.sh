#!/bin/zsh
aspire publish -o compose-output
docker-compose -f compose-output/docker-compose.yaml up -d