import express from 'express';
import cors from 'cors';
import problemRoutes from './routes/problemRoutes.js';
import judgeRoutes from './routes/judgeRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/problems', problemRoutes);
app.use('/api/judge', judgeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

export default app; 