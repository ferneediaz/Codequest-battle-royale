import express from "express";
import { judgeService } from "../services/judgeService.js";
const router = express.Router();
router.post("/submissions", async (req, res) => {
  try {
    const submissionData = req.body;
    console.log("Received judge submission request");
    const result = await judgeService.submitCode(submissionData);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in judge submission route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      error: "Failed to process submission",
      message: errorMessage
    });
  }
});
router.get("/submissions/:token", async (req, res) => {
  try {
    const { token } = req.params;
    console.log(`Received request for submission result: ${token}`);
    const result = await judgeService.getSubmissionResult(token);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in judge result route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      error: "Failed to get submission result",
      message: errorMessage
    });
  }
});
var judgeRoutes_default = router;
export {
  judgeRoutes_default as default
};
