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
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/health`);
    console.log(`API endpoints available at: http://localhost:${PORT}/api/*`);
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 