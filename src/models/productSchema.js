const mongoose = require("mongoose");
const { Schema } = mongoose;

var productSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "categories",
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        variants: [
            {
                name: {
                    type: String,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                },
            },
        ],
        images: [
            {
                type: String,
                required: true,
            },
        ],
        status: {
            type: Boolean,
            default: true,
        },
        totalStock: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true } 
);


productSchema.pre('save', function(next) {
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((sum, variant) => sum + variant.quantity, 0);
  }
  next();
});

const Product = mongoose.model("product", productSchema);
module.exports = Product;