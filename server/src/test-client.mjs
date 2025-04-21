// Simple test client to verify API endpoints (ESM version)
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

const testApi = async () => {
  try {
    console.log('🔍 Testing server API...');
    
    // Test health endpoint
    console.log('\n🩺 Testing health endpoint:');
    const healthResponse = await fetch('http://localhost:5000/health');
    console.log('Status:', healthResponse.status);
    console.log('Response:', await healthResponse.json());
    
    // Test get all problems
    console.log('\n📚 Testing get all problems:');
    const problemsResponse = await fetch(`${API_URL}/problems`);
    console.log('Status:', problemsResponse.status);
    const problems = await problemsResponse.json();
    console.log(`Fetched ${problems.length} problems`);
    
    if (problems.length > 0) {
      const firstProblem = problems[0];
      console.log('Sample problem:', {
        id: firstProblem.id,
        title: firstProblem.title,
        category: firstProblem.category,
        difficulty: firstProblem.difficulty
      });
      
      // Test get problem by ID
      console.log(`\n🔎 Testing get problem by ID (${firstProblem.id}):`);
      const problemResponse = await fetch(`${API_URL}/problems/${firstProblem.id}`);
      console.log('Status:', problemResponse.status);
      const problem = await problemResponse.json();
      console.log('Problem title:', problem.title);
      
      // Test get problems by category
      console.log(`\n🏷️ Testing get problems by category (${firstProblem.category}):`);
      const categoryProblemsResponse = await fetch(
        `${API_URL}/problems/category/${encodeURIComponent(firstProblem.category)}`
      );
      console.log('Status:', categoryProblemsResponse.status);
      const categoryProblems = await categoryProblemsResponse.json();
      console.log(`Fetched ${categoryProblems.length} problems in category ${firstProblem.category}`);
    }
    
    console.log('\n✅ API tests completed successfully');
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
};

testApi(); 