import express from "express";
import {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} from "../controller/subscription.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public route - anyone can view available subscriptions
router.get("/", getAllSubscriptions);
router.get("/:id", getSubscriptionById);

// Admin only routes
router.post("/", protect, createSubscription);
router.put("/:id", protect, updateSubscription);
router.delete("/:id", protect, deleteSubscription);

export default router;
