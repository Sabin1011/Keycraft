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
  if (this.products && this.products.length > 0) {
    const uniqueProducts = [];
    const seenIds = new Set();

    for (const item of this.products) {
      const idString = item.productId.toString();
      if (!seenIds.has(idString)) {
        seenIds.add(idString);
        uniqueProducts.push(item);
      }
    }

    this.products = uniqueProducts;
  }
  next();
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
