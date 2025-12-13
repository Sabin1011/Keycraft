const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    offerType: {
      type: String,
      enum: ["product", "category", "cart"],
      required: true,
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },

    discountValue: { type: Number, required: true },

    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: [],
      },
    ],

    categoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: [],
      },
    ],

    minPurchaseAmount: { type: Number, default: 0 }, // for cart-level

    maxDiscountAmount: { type: Number, default: null },

    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
