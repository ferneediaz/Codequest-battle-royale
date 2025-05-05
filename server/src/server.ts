import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { testConnection } from './services/supabaseService.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Test Supabase connection before starting server
  const connected = await testConnection();
  if (!connected) {
    console.warn('⚠️ Warning: Could not establish Supabase connection. Server starting anyway...');
  } else {
    console.log('✅ Supabase connection successful');
  }

  app.listen(PORT, () => {
    // Use proper base URL depending on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction 
      ? process.env.RENDER_EXTERNAL_URL || `https://codequest-battle-royale.onrender.com` 
      : `http://localhost:${PORT}`;
    
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Health check available at: ${baseUrl}/health`);
    console.log(`API endpoints available at: ${baseUrl}/api/*`);
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 