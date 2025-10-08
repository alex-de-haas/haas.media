#!/bin/bash

# Generate a secure JWT secret for local authentication
# Usage: ./generate-jwt-secret.sh

echo "Generating secure JWT secret..."
echo ""

# Generate a 48-byte (384-bit) random secret encoded in base64
SECRET=$(openssl rand -base64 48)

echo "Generated JWT Secret:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Add this to your .env.local file:"
echo "JWT_SECRET=$SECRET"
echo ""
echo "For local authentication, make sure Auth0 variables are NOT set."
