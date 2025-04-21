#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we have a .env file
const envPath = join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file is missing. Please create it with your Supabase credentials.');
  console.error('Example:');
  console.error('PORT=5000');
  console.error('SUPABASE_URL=your_url');
  console.error('SUPABASE_ANON_KEY=your_key');
  process.exit(1);
}

console.log('🚀 Starting server with Node.js ESM...');

// Run the server using the node --loader option to handle ESM TypeScript
const serverProcess = spawn('node', [
  '--loader', 'ts-node/esm',
  'src/server.ts'
], {
  stdio: 'inherit',
  env: process.env
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
}); 