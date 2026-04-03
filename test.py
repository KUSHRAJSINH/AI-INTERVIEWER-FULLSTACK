from google.cloud import storage

client = storage.Client.from_service_account_json(
    "InterviewAI_FastAPI/data/service-account.json"
)

bucket = client.bucket("ai-interview-resume")

blob = bucket.blob("test.pdf")

blob.upload_from_filename("InterviewAI_FastAPI/data/sample_resume.pdf")

print("Upload successful")