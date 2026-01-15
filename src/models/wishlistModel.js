const mongoose = require("mongoose");
const { Schema } = mongoose;

const wishlistSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1 }, { unique: true });

wishlistSchema.pre("save", function (next) {
  if (!this.products) return next();

  const unique = new Map();

  for (const item of this.products) {
    const key = `${item.productId.toString()}-${item.variantId?.toString() || "default"}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  this.products = Array.from(unique.values());
  next();
});


const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
