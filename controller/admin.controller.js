import { User } from "../model/user.model.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { Order } from "../model/order.model.js";
import { paymentInfo } from "../model/payment.model.js";

// Get dashboard overview with counts and reports
export const getAdminDashboardOverview = catchAsync(async (req, res, next) => {
  const { period = "month" } = req.query; // day, week, month, year

  // Get total counts
  const totalSeller = await User.countDocuments({ role: "seller" });
  const totalUser = await User.countDocuments({ role: "user" });

  // Get total revenue from completed payments
  const revenueResult = await paymentInfo.aggregate([
    { $match: { paymentStatus: "complete", type: "order" } },
    { $group: { _id: null, total: { $sum: "$price" } } },
  ]);
  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

  // Revenue report data
  const revenueReportData = await getRevenueReportData(period);

  // User and seller joining report
  const joiningReportData = await getUserSellerJoiningReport(period);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin dashboard overview retrieved successfully",
    data: {
      overview: {
        totalSeller,
        totalUser,
        totalRevenue,
      },
      revenueReport: revenueReportData,
      joiningReport: joiningReportData,
    },
  });
});

// Helper function to get revenue report data
const getRevenueReportData = async (period) => {
  let groupBy, dateFormat, startDate;
  const now = new Date();

  switch (period) {
    case "day":
      groupBy = { $hour: "$createdAt" };
      dateFormat = "%H:00";
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      groupBy = { $dayOfWeek: "$createdAt" };
      dateFormat = "%w";
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "year":
      groupBy = { $month: "$createdAt" };
      dateFormat = "%m";
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "month":
    default:
      groupBy = { $dayOfMonth: "$createdAt" };
      dateFormat = "%d";
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const thisMonthRevenue = await paymentInfo.aggregate([
    {
      $match: {
        paymentStatus: "complete",
        type: "order",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: "$price" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get last period data for comparison
  let lastPeriodStart, lastPeriodEnd;
  if (period === "month") {
    lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === "week") {
    lastPeriodStart = new Date(now.setDate(now.getDate() - 14));
    lastPeriodEnd = new Date(now.setDate(now.getDate() - 7));
  } else if (period === "year") {
    lastPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
    lastPeriodEnd = new Date(now.getFullYear() - 1, 11, 31);
  } else {
    lastPeriodStart = new Date(now.setDate(now.getDate() - 1));
    lastPeriodEnd = new Date(now);
  }

  const lastMonthRevenue = await paymentInfo.aggregate([
    {
      $match: {
        paymentStatus: "complete",
        type: "order",
        createdAt: { $gte: lastPeriodStart, $lte: lastPeriodEnd },
      },
    },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: "$price" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    thisMonth: thisMonthRevenue,
    lastMonth: lastMonthRevenue,
    period,
  };
};

// Helper function to get user and seller joining report
const getUserSellerJoiningReport = async (period) => {
  let groupBy, startDate;
  const now = new Date();

  switch (period) {
    case "day":
      groupBy = { $hour: "$createdAt" };
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      groupBy = { $dayOfWeek: "$createdAt" };
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "year":
      groupBy = { $month: "$createdAt" };
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "month":
    default:
      groupBy = { $dayOfMonth: "$createdAt" };
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const joiningData = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          period: groupBy,
          role: "$role",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.period": 1 } },
  ]);

  // Transform data for frontend consumption
  const users = [];
  const sellers = [];

  joiningData.forEach((item) => {
    if (item._id.role === "user") {
      users.push({ period: item._id.period, count: item.count });
    } else if (item._id.role === "seller") {
      sellers.push({ period: item._id.period, count: item.count });
    }
  });

  return {
    users,
    sellers,
    period,
  };
};

// Get user profile list with aggregated data
export const getUserProfileList = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, search, status } = req.query;

  const filter = { role: "user" };

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .select("firstName lastName email phone avatar createdAt")
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  // Get aggregated order data for each user
  const userIds = users.map((user) => user._id);

  const orderAggregation = await Order.aggregate([
    { $match: { customer: { $in: userIds } } },
    {
      $group: {
        _id: "$customer",
        totalOrders: { $sum: 1 },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
      },
    },
  ]);

  // Map order data to users
  const orderDataMap = {};
  orderAggregation.forEach((item) => {
    orderDataMap[item._id.toString()] = item;
  });

  // Get dispute counts (assuming you have a dispute/review system)
  const usersWithData = users.map((user) => {
    const userId = user._id.toString();
    const orderData = orderDataMap[userId] || {
      totalOrders: 0,
      deliveredOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
    };

    return {
      userId: user._id,
      buyerName:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      totalOrders: orderData.totalOrders,
      deliveredOrders: orderData.deliveredOrders,
      pendingOrders: orderData.pendingOrders,
      cancelledOrders: orderData.cancelledOrders,
      activityLog: orderData.totalOrders > 0 ? "Active" : "Inactive",
      disputes: 0,
      createdAt: user.createdAt,
    };
  });

  const total = await User.countDocuments(filter);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile list retrieved successfully",
    data: {
      users: usersWithData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});
