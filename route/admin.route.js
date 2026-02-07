import express from "express";
import {
  getAdminDashboardOverview,
  getUserProfileList,
} from "../controller/admin.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect);

router.get("/overview", getAdminDashboardOverview);
router.get("/users", getUserProfileList);

export default router;
