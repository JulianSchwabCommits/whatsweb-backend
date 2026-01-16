#!/bin/bash
# install github CLI: 
# - sudo apt install gh
# - gh auth login

# install azure CLI: 
# - curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
# - az login



set -e

[ -f .env ] || { echo ".env not found"; exit 1; }

grep -v '^#' .env | grep '=' | while IFS='=' read -r key value; do
  value="${value%\"}"
  value="${value#\"}"

  echo "$value" | gh secret set "$key"
  echo "✔ $key"
done



ENV_FILE=".env"
RESOURCE_GROUP="whatsweb-rg"
WEBAPP_NAME="whatsweb-backend"

[ -f "$ENV_FILE" ] || { echo "$ENV_FILE not found"; exit 1; }

# Read .env robustly
ENV_VARS=()
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^# ]] && continue

  # Split into key=value
  key="${line%%=*}"
  value="${line#*=}"

  # Trim whitespace and remove quotes
  key="$(echo "$key" | xargs)"
  value="$(echo "$value" | xargs)"
  value="${value%\"}"
  value="${value#\"}"

  ENV_VARS+=("$key=$value")
done < "$ENV_FILE"

# Fail if no variables found
[ ${#ENV_VARS[@]} -gt 0 ] || { echo "Error: no variables found in $ENV_FILE"; exit 1; }

# Push to Azure Web App
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings "${ENV_VARS[@]}"

echo "Updated secrets for $WEBAPP_NAME"
