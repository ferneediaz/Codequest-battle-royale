# CodeQuest Battle Royale API Server

This Express server provides API endpoints for the CodeQuest Battle Royale application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the server directory with the following variables:
```
PORT=5000
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

3. Replace the Supabase credentials with your actual credentials. These should match the ones used in your frontend application.

## Running the Server

There are multiple ways to run the development server:

```bash
# Using nodemon (recommended for development)
npm run dev

# Quick start without nodemon
npm run dev:quick

# Run the test client (separate from the server)
npm test
```

To build the production version:
```bash
npm run build
```

To start the production server:
```bash
npm start
```

## Notes About ES Modules

This server uses ES modules (ESM) instead of CommonJS. This means:

1. All imports must include file extensions (`.js`, not `.ts`)
2. When importing TypeScript files, still use `.js` extension (TS will compile to JS)
3. The `type: "module"` is set in package.json

## Available Endpoints

### Health Check
- `GET /health` - Check if the server is running

### Problem Endpoints
- `GET /api/problems` - Get all coding problems
- `GET /api/problems/:id` - Get a problem by ID
- `GET /api/problems/category/:category` - Get problems by category 