import os
from google.cloud import storage
import uuid

# Resolve absolute path to service-account.json based on this file's location
current_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(os.path.dirname(current_dir))
service_account_path = os.path.join(base_dir, "data", "service-account.json")

client = storage.Client.from_service_account_json(service_account_path)

bucket = client.bucket("ai-interview-resume")
def upload_resume(file):

    filename = f"resumes/{uuid.uuid4()}.pdf"

    blob = bucket.blob(filename)

    blob.upload_from_file(file, content_type="application/pdf")

    return blob.public_url