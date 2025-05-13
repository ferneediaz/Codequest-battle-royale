import express from "express";
import cors from "cors";
import problemRoutes from "./routes/problemRoutes.js";
import judgeRoutes from "./routes/judgeRoutes.js";
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/problems", problemRoutes);
app.use("/api/judge", judgeRoutes);
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});
var app_default = app;
export {
  app_default as default
};
