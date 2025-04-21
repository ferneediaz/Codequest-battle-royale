import { Request, Response } from 'express';
import { supabase } from '../services/supabaseService.js';

/**
 * Get all coding problems
 */
export const getAllProblems = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('coding_problems')
      .select('*')
      .order('difficulty', { ascending: true });
    
    if (error) {
      console.error('Error fetching problems:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error in getAllProblems:', error);
    return res.status(500).json({ error: error.message || 'An unknown error occurred' });
  }
};

/**
 * Get a single problem by ID
 */
export const getProblemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('coding_problems')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Problem not found' });
      }
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error in getProblemById:', error);
    return res.status(500).json({ error: error.message || 'An unknown error occurred' });
  }
};

/**
 * Get problems by category
 */
export const getProblemsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    const { data, error } = await supabase
      .from('coding_problems')
      .select('*')
      .eq('category', category)
      .order('difficulty', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error in getProblemsByCategory:', error);
    return res.status(500).json({ error: error.message || 'An unknown error occurred' });
  }
}; 