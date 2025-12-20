const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
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
                type: mongoose.Schema.Types.ObjectId,
                required: false,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],

    grandTotal: {
        type: Number,
        default: 0,
    },

    cartDiscount: {
        type: Number,
        default: 0,
    },
    totalPrice: {
        type: Number,
        default: 0
    },
    
});

module.exports = mongoose.model("Cart", cartSchema);
