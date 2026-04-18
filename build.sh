#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

cd neurodeck
python manage.py collectstatic --noinput
python manage.py migrate

# This creates the superuser using environment variables
if [ "$CREATE_SUPERUSER" ]; then
  python manage.py shell << END