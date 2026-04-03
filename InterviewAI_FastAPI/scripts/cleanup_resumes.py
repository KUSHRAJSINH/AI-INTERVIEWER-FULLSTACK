import os
import time

DATA_FOLDER = "data"
RETENTION_DAYS = 20

now = time.time()

for filename in os.listdir(DATA_FOLDER):

    path = os.path.join(DATA_FOLDER, filename)

    if not os.path.isfile(path):
        continue

    file_age = now - os.path.getmtime(path)

    if file_age > RETENTION_DAYS * 86400:
        print(f"Deleting old resume: {filename}")
        os.remove(path)