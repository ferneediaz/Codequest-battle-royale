import express, { Request, Response } from 'express';
import cors from 'cors';
import problemRoutes from './routes/problemRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/problems', problemRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

export default app; 