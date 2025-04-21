#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = __dirname;
const rootDir = join(serverDir, '..');
const frontendEnvPath = join(rootDir, '.env');
const serverEnvPath = join(serverDir, '.env');

console.log('📋 Copying Supabase credentials from frontend to server...');
console.log(`Checking frontend .env at: ${frontendEnvPath}`);

// Check if frontend .env exists
if (!existsSync(frontendEnvPath)) {
  console.error('❌ Frontend .env file not found. Please create it first.');
  console.error(`Expected at: ${frontendEnvPath}`);
  process.exit(1);
}

// Read frontend .env
const frontendEnv = readFileSync(frontendEnvPath, 'utf8');

// Extract SUPABASE credentials using regex
const supabaseUrlMatch = frontendEnv.match(/VITE_SUPABASE_URL=(.+)/);
const supabaseKeyMatch = frontendEnv.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error('❌ Could not find Supabase credentials in frontend .env file.');
  console.error('Please make sure your frontend .env contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabaseUrl = supabaseUrlMatch[1];
const supabaseKey = supabaseKeyMatch[1];

// Create server .env content
const serverEnvContent = `# Server port
PORT=5000

# Supabase connection credentials
# Copied from frontend .env file (VITE_* variables)
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseKey}
`;

// Write to server .env
writeFileSync(serverEnvPath, serverEnvContent);

console.log('✅ Supabase credentials copied successfully!');
console.log(`Server .env created at: ${serverEnvPath}`);
console.log('\nYou can now run the server with:');
console.log('npm run dev:quick'); 