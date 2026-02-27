#!/bin/bash

# Supabase config
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env"
  exit 1
fi

# Test credentials  
EMAIL="test@example.com"
PASSWORD="test123test"

echo "=== Creating Test User ==="
echo "Email: $EMAIL"
echo ""

# Try to sign up
SIGNUP_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Signup response:"
echo "$SIGNUP_RESPONSE" | jq '.'

# Try to sign in
SIGNIN_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo ""
echo "=== Sign In Response ==="
ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token // empty')

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✓ Success! Access token generated"
  echo ""
  echo "Credentials for browser:"
  echo "  Email: $EMAIL"
  echo "  Password: $PASSWORD"
  echo ""
  echo "To use in browser, navigate to: http://localhost:3000/auth"
else
  echo "Status check:"
  echo "$SIGNIN_RESPONSE" | jq '.'
fi
