var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import fetch from "node-fetch";
class JudgeService {
  constructor(apiUrl) {
    __publicField(this, "apiUrl");
    this.apiUrl = apiUrl || process.env.JUDGE0_API_URL || "";
    if (!this.apiUrl) {
      console.warn("\u26A0\uFE0F Warning: Judge0 API URL is not configured. Set JUDGE0_API_URL environment variable.");
    }
  }
  /**
   * Submit code to Judge0
   */
  async submitCode(submissionData) {
    if (!this.apiUrl) {
      throw new Error("Judge0 API URL is not configured. Set JUDGE0_API_URL environment variable.");
    }
    console.log("SERVER PROXY - Forwarding submission to Judge0");
    try {
      const response = await fetch(`${this.apiUrl}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(submissionData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Judge0 API error: ${response.status} ${response.statusText}
${errorText}`);
      }
      const data = await response.json();
      console.log("SERVER PROXY - Judge0 submission response received");
      return data;
    } catch (error) {
      console.error("SERVER PROXY - Error submitting to Judge0:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error submitting to Judge0");
    }
  }
  /**
   * Get submission result from Judge0
   */
  async getSubmissionResult(token) {
    if (!this.apiUrl) {
      throw new Error("Judge0 API URL is not configured. Set JUDGE0_API_URL environment variable.");
    }
    console.log(`SERVER PROXY - Getting submission result for token: ${token}`);
    try {
      const response = await fetch(`${this.apiUrl}/submissions/${token}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Judge0 API error: ${response.status} ${response.statusText}
${errorText}`);
      }
      const data = await response.json();
      console.log("SERVER PROXY - Judge0 result response received");
      return data;
    } catch (error) {
      console.error("SERVER PROXY - Error getting result from Judge0:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error getting result from Judge0");
    }
  }
}
const judgeService = new JudgeService();
export {
  JudgeService,
  judgeService
};
