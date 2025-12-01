const mongoose = require("mongoose");
const { Schema } = mongoose;

const generateOrderId = require("../middleware/generateOrderId");

const orderSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      }
    }
  ],

  orderId: {
    type: String,
    unique: true
  },

  totalAmount: {
    type: Number,
    required: true
  },

  address: {
    type: Object,
    required: true
  },

  status: {
    type: String,
    default: "Confirmed"
  },
  paymentMethod: {
    type: String,
    required: true
  },

}, { timestamps: true });

orderSchema.pre("save", generateOrderId);

module.exports = mongoose.model("Order", orderSchema);
