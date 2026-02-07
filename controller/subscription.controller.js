import { Subscription } from "../model/subscription.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "../errors/AppError.js";

// Create new subscription plan (Admin only)
export const createSubscription = catchAsync(async (req, res, next) => {
  const { planName, pricePerMonth, pricePerYear, description, features } =
    req.body;

  if (!planName || pricePerMonth === undefined || pricePerYear === undefined) {
    return next(new AppError("Plan name and prices are required", 400));
  }

  const subscription = await Subscription.create({
    planName,
    pricePerMonth,
    pricePerYear,
    description,
    features: features || [],
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Subscription plan created successfully",
    data: subscription,
  });
});

// Get all subscription plans
export const getAllSubscriptions = catchAsync(async (req, res, next) => {
  const { isActive } = req.query;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  const subscriptions = await Subscription.find(filter).sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscriptions retrieved successfully",
    data: subscriptions,
  });
});

// Get single subscription plan
export const getSubscriptionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const subscription = await Subscription.findById(id);

  if (!subscription) {
    return next(new AppError("Subscription plan not found", 404));
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription retrieved successfully",
    data: subscription,
  });
});

// Update subscription plan (Admin only)
export const updateSubscription = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    planName,
    pricePerMonth,
    pricePerYear,
    description,
    features,
    isActive,
  } = req.body;

  const subscription = await Subscription.findById(id);

  if (!subscription) {
    return next(new AppError("Subscription plan not found", 404));
  }

  if (planName !== undefined) subscription.planName = planName;
  if (pricePerMonth !== undefined) subscription.pricePerMonth = pricePerMonth;
  if (pricePerYear !== undefined) subscription.pricePerYear = pricePerYear;
  if (description !== undefined) subscription.description = description;
  if (features !== undefined) subscription.features = features;
  if (isActive !== undefined) subscription.isActive = isActive;

  await subscription.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription plan updated successfully",
    data: subscription,
  });
});

// Delete subscription plan (Admin only)
export const deleteSubscription = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const subscription = await Subscription.findByIdAndDelete(id);

  if (!subscription) {
    return next(new AppError("Subscription plan not found", 404));
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription plan deleted successfully",
    data: null,
  });
});
