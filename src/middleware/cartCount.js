
const mongoose = require('mongoose');

const cartCountMiddleware = async (req, res, next) => {
    if (!req.session.user?._id) {
        res.locals.cartCount = 0;
        return next();
    }

    try {
        const Cart = mongoose.model('Cart'); 
        const cart = await Cart.findOne({ userId: req.session.user._id }).lean();

        const count = cart
               ? cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
            : 0;

        res.locals.cartCount = count;
    } catch (err) {
        console.log("Cart count error:", err.message);
        res.locals.cartCount = 0;
    }

    next();
};

module.exports = cartCountMiddleware;