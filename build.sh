#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

cd neurodeck
python manage.py collectstatic --noinput
python manage.py migrate

# create superuser
if [ "$CREATE_SUPERUSER" ]; then
  python manage.py shell << END

#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

# Move into the directory where manage.py lives
cd neurodeck

python manage.py collectstatic --noinput
python manage.py migrate

# This creates the superuser using environment variables
if [ "$CREATE_SUPERUSER" ]; then
  python manage.py shell << END
from django.contrib.auth import get_user_model
import os

User = get_user_model()
username = os.getenv('DJANGO_SUPERUSER_USERNAME')
email = os.getenv('DJANGO_SUPERUSER_EMAIL')
password = os.getenv('DJANGO_SUPERUSER_PASSWORD')

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f"Superuser '{username}' created successfully.")
else:
    print(f"Superuser '{username}' already exists. Skipping creation.")
END
fi



