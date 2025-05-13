import fetch from "node-fetch";
const API_URL = "http://localhost:5000/api";
const testApi = async () => {
  try {
    console.log("\u{1F50D} Testing server API...");
    console.log("\n\u{1FA7A} Testing health endpoint:");
    const healthResponse = await fetch("http://localhost:5000/health");
    console.log("Status:", healthResponse.status);
    console.log("Response:", await healthResponse.json());
    console.log("\n\u{1F4DA} Testing get all problems:");
    const problemsResponse = await fetch(`${API_URL}/problems`);
    console.log("Status:", problemsResponse.status);
    const problems = await problemsResponse.json();
    console.log(`Fetched ${problems.length} problems`);
    if (problems.length > 0) {
      const firstProblem = problems[0];
      console.log("Sample problem:", {
        id: firstProblem.id,
        title: firstProblem.title,
        category: firstProblem.category,
        difficulty: firstProblem.difficulty
      });
      console.log(`
\u{1F50E} Testing get problem by ID (${firstProblem.id}):`);
      const problemResponse = await fetch(`${API_URL}/problems/${firstProblem.id}`);
      console.log("Status:", problemResponse.status);
      const problem = await problemResponse.json();
      console.log("Problem title:", problem.title);
      console.log(`
\u{1F3F7}\uFE0F Testing get problems by category (${firstProblem.category}):`);
      const categoryProblemsResponse = await fetch(
        `${API_URL}/problems/category/${encodeURIComponent(firstProblem.category)}`
      );
      console.log("Status:", categoryProblemsResponse.status);
      const categoryProblems = await categoryProblemsResponse.json();
      console.log(`Fetched ${categoryProblems.length} problems in category ${firstProblem.category}`);
    }
    console.log("\n\u2705 API tests completed successfully");
  } catch (error) {
    console.error("\u274C API test failed:", error);
  }
};
testApi();
