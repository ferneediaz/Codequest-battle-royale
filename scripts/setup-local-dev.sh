#!/bin/bash

# Set up local development environment

# Create frontend .env for local development with server URL
echo "Creating frontend .env file..."
# First backup any existing .env
if [ -f ".env" ]; then
  cp .env .env.backup
  echo "✅ Backed up existing .env to .env.backup"
  
  # Update just the server URL in the existing file
  sed -i "s|VITE_SERVER_URL=.*|VITE_SERVER_URL=http://localhost:5000|g" .env
else
  # Create new file if it doesn't exist
  cat > .env << EOF
VITE_SERVER_URL=http://localhost:5000
# Add your Supabase credentials below:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF
fi

echo "✅ Frontend .env updated with local server URL"

# Use the existing script to copy credentials to server/.env
echo "Setting up server environment using copy-frontend-env.mjs..."
node server/copy-frontend-env.mjs || {
  echo "⚠️ Error running copy-frontend-env.mjs"
  echo "Please make sure you have Supabase credentials in your .env file."
  echo "Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
}

# Set Judge0 API URL in server/.env
if [ -f "server/.env" ]; then
  # Check if JUDGE0_API_URL already exists in the file
  if grep -q JUDGE0_API_URL server/.env; then
    # Update existing entry
    sed -i "s|JUDGE0_API_URL=.*|JUDGE0_API_URL=http://localhost:2358|g" server/.env
  else
    # Add new entry
    echo "JUDGE0_API_URL=http://localhost:2358" >> server/.env
  fi
  echo "✅ Judge0 API URL set to http://localhost:2358 in server/.env"
else
  echo "⚠️ server/.env not found after running copy-frontend-env.mjs"
  mkdir -p server
  echo "JUDGE0_API_URL=http://localhost:2358" > server/.env
  echo "Created minimal server/.env with Judge0 URL"
fi

# Check if Judge0 is already running
if [ "$(docker ps | grep judge0)" ]; then
  echo "⚠️ Judge0 appears to be already running in Docker."
  echo "Using existing Judge0 instance on port 2358."
else
  # Start Docker containers
  echo "Starting Docker containers..."
  docker-compose up -d
  echo "✅ Docker containers started"
fi

echo "🚀 Local development environment is ready!"
echo ""
echo "Run 'npm run dev:server' to start the server"
echo "Run 'npm run dev' to start the frontend"
echo ""
echo "To switch back to production settings, run 'npm run use:prod'" 