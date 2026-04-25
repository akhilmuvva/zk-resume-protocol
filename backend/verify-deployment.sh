#!/bin/bash
# verify-deployment.sh - ZK Resume Protocol
# Usage: ./verify-deployment.sh <network>

NETWORK=$1
if [ -z "$NETWORK" ]; then
  NETWORK="sepolia"
fi

DEPLOYMENT_FILE="deployments/$NETWORK.json"

if [ ! -f "$DEPLOYMENT_FILE" ]; then
  echo "Error: Deployment file $DEPLOYMENT_FILE not found."
  exit 1
fi

# Extract addresses (requires jq)
if command -v jq >/dev/null 2>&1; then
    VERIFIER=$(jq -r '.contracts.ResumeVerifier' $DEPLOYMENT_FILE)
    REGISTRY=$(jq -r '.contracts.ResumeRegistry' $DEPLOYMENT_FILE)
else
    # Fallback to grep/sed if jq is missing
    VERIFIER=$(grep -oP '"ResumeVerifier": "\K[^"]+' $DEPLOYMENT_FILE)
    REGISTRY=$(grep -oP '"ResumeRegistry": "\K[^"]+' $DEPLOYMENT_FILE)
fi

echo "────────────────────────────────────────────"
echo "  Verifying Contracts on $NETWORK"
echo "  Verifier: $VERIFIER"
echo "  Registry: $REGISTRY"
echo "────────────────────────────────────────────"

echo "Verifying ResumeVerifier..."
npx hardhat verify --network $NETWORK $VERIFIER

echo "Verifying ResumeRegistry..."
npx hardhat verify --network $NETWORK $REGISTRY $VERIFIER
