import { Router } from "express";
import {
  getAllProblems,
  getProblemById,
  getProblemsByCategory
} from "../controllers/problemController.js";
const router = Router();
router.get("/", getAllProblems);
router.get("/:id", getProblemById);
router.get("/category/:category", getProblemsByCategory);
var problemRoutes_default = router;
export {
  problemRoutes_default as default
};
