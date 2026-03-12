#!/bin/bash
echo "Deploying Agent Engine and Cloud Run..."

# 1. Deploy Agent Engine (Assuming simple Vertex AI endpoint for now)
# gcloud ai endpoints create ...

# 2. Deploy Cloud Run
gcloud run deploy pm-agent-ui \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GCP_PROJECT_ID=$(gcloud config get-value project),GCP_REGION=us-central1"
