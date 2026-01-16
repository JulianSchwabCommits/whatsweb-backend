#!/bin/bash
# install CLI: 
# - sudo apt install gh
# - gh auth login

set -e

[ -f .env ] || { echo ".env not found"; exit 1; }

grep -v '^#' .env | grep '=' | while IFS='=' read -r key value; do
  value="${value%\"}"
  value="${value#\"}"

  echo "$value" | gh secret set "$key"
  echo "✔ $key"
done
