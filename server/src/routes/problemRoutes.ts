import { Router } from 'express';
import { 
  getAllProblems,
  getProblemById,
  getProblemsByCategory
} from '../controllers/problemController.js';

const router = Router();

// GET /api/problems
router.get('/', getAllProblems);

// GET /api/problems/:id
router.get('/:id', getProblemById);

// GET /api/problems/category/:category
router.get('/category/:category', getProblemsByCategory);

export default router; 