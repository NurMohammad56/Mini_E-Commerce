import express from "express";
import {
  getSellerDashboardOverview,
  getSellerSalesHistory,
} from "../controller/seller.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/overview", getSellerDashboardOverview);
router.get("/sales", getSellerSalesHistory);

export default router;
