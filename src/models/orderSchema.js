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
      variantId:{
        type:mongoose.Schema.Types.ObjectId,
        required: false,
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
  discountAmount: {
    type: Number,
    default: 0
  },
    subtotal: {
    type: Number,
    required: true,
  },

  finalAmount: {
    type: Number,
    required: true
  },
  offerDiscount: {
  type: Number,
  default: 0
},

  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
    default: null
  },


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
    enum:["Placed","Confirmed","Shipped","Out For Delivery", "Delivered","Cancelled","Returned","Return Requested"],
    default: "Placed"
  },
  paymentMethod: {
    type: String,
    required: true
  },
  cancelReason: {
  type: String,
  default: null
}

}, { timestamps: true });

orderSchema.pre("save", generateOrderId);

module.exports = mongoose.model("Order", orderSchema);
