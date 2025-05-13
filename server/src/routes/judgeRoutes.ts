import express from 'express';
import { judgeService } from '../services/judgeService.js';

const router = express.Router();

/**
 * Route for submitting code to Judge0
 * @route POST /api/judge/submissions
 */
router.post('/submissions', async (req, res) => {
  try {
    const submissionData = req.body;
    
    console.log('Received judge submission request');
    
    // Forward request to Judge0 via our service
    const result = await judgeService.submitCode(submissionData);
    
    // Send the response back to client
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in judge submission route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to process submission',
      message: errorMessage
    });
  }
});

/**
 * Route for getting submission results from Judge0
 * @route GET /api/judge/submissions/:token
 */
router.get('/submissions/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log(`Received request for submission result: ${token}`);
    
    // Get submission result from Judge0 via our service
    const result = await judgeService.getSubmissionResult(token);
    
    // Send the response back to client
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in judge result route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to get submission result',
      message: errorMessage
    });
  }
});

export default router; 