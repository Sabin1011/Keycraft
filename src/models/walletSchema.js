const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  transactions: [
    {
      amount: Number,
      type: {
        type: String, 
        enum: ["credit", "debit"],
      },
      reason: String,
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      itemId:{
        type:mongoose.Schema.Types.ObjectId,
        default:null,
      },
    },
  ],
});

module.exports = mongoose.model("Wallet", walletSchema);
