const Wallet = require("../../models/walletSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartModel");
const Product = require("../../models/productSchema");

const loadWalletPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = User.findOne(userId);
    let wallet = await Wallet.findOne({ userId }).lean();
    let cartCount = 0;

    if (userId) {
      const cart = await Cart.findOne({ userId });
      if (cart && cart.items) {
        cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }

    if (!wallet) {
      wallet = {
        balance: 0,
        transactions: [],
      };
    }

    res.render("wallet", {
      cartCount,
      wallet,
      user,
    });
  } catch (error) {
    console.error("Load Wallet Error:", error);
    res.redirect("/");
  }
};

module.exports = {
  loadWalletPage,
};
