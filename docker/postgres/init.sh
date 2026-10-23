#!/bin/sh
# Runs once, when the local Postgres volume is first created (docker-entrypoint-initdb.d).
# Hands the LOCAL passwords from the compose environment to init.sql as psql variables, so the
# SQL file holds no password. CI runs the same SQL: see the README.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v owner_password="$CLOSELINE_OWNER_PASSWORD" \
  -v auth_password="$CLOSELINE_AUTH_PASSWORD" \
  -v core_password="$CLOSELINE_CORE_PASSWORD" \
  -v playbook_password="$CLOSELINE_PLAYBOOK_PASSWORD" \
  -v voice_password="$CLOSELINE_VOICE_PASSWORD" \
  -f /etc/closeline/init.sql
