import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    planName: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
    },
    pricePerMonth: {
      type: Number,
      required: [true, "Monthly price is required"],
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    pricePerYear: {
      type: Number,
      required: [true, "Yearly price is required"],
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
