#!/bin/bash

# Set up production environment

# Create frontend .env for production with server URL
echo "Creating frontend .env file..."
# First backup any existing .env
if [ -f ".env" ]; then
  cp .env .env.backup
  echo "✅ Backed up existing .env to .env.backup"
  
  # Update just the server URL in the existing file
  sed -i "s|VITE_SERVER_URL=.*|VITE_SERVER_URL=https://codequest-battle-royale.onrender.com|g" .env
else
  # Create new file if it doesn't exist
  cat > .env << EOF
VITE_SERVER_URL=https://codequest-battle-royale.onrender.com
# Add your Supabase credentials below:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF
fi

echo "✅ Frontend .env updated with production server URL"

# Use the existing script to copy credentials to server/.env
echo "Setting up server environment using copy-frontend-env.mjs..."
node server/copy-frontend-env.mjs || {
  echo "⚠️ Error running copy-frontend-env.mjs"
  echo "Please make sure you have Supabase credentials in your .env file."
  echo "Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
}

# Set Judge0 API URL in server/.env for production
if [ -f "server/.env" ]; then
  # Check if JUDGE0_API_URL already exists in the file
  if grep -q JUDGE0_API_URL server/.env; then
    # Update existing entry
    sed -i "s|JUDGE0_API_URL=.*|JUDGE0_API_URL=https://judge0.codequest-royale.com|g" server/.env
  else
    # Add new entry
    echo "JUDGE0_API_URL=https://judge0.codequest-royale.com" >> server/.env
  fi
  echo "✅ Judge0 API URL set to production in server/.env"
else
  echo "⚠️ server/.env not found after running copy-frontend-env.mjs"
  mkdir -p server
  echo "JUDGE0_API_URL=https://judge0.codequest-royale.com" > server/.env
  echo "Created minimal server/.env with Judge0 URL"
fi

# Stop Docker containers if they're running
echo "Stopping Docker containers..."
docker-compose down
echo "✅ Docker containers stopped"

echo "🚀 Production environment is ready!"
echo ""
echo "To switch back to local development, run 'npm run use:local'" 