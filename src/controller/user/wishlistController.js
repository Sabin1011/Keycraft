const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Wishlist = require("../../models/wishlistModel");
const mongoose = require("mongoose");
const Cart = require("../../models/cartModel")
const path = require("path");
const fs = require("fs");
const sendEmail = require("../../utils/sendEmail");

const bcrypt = require("bcrypt");

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById( userId )
     
    
    const cart = await  Cart.findOne({userId: req.session.userId});
      let cartCount = 0;

      if (userId) {
        const cart = await Cart.findOne({ userId });
        if (cart && cart.items) {
          cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }

    const wishlist = await Wishlist.findOne({
      userId: req.session.userId,
    }).populate({
      path: "products.productId",
      populate: { path: "category", select: "name status" },
    });

    let products = wishlist?.products || [];

    res.render("wishlist", { products, user,cartCount});
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.render("wishlist", { products: [], user,  cartCount });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.id;
    const variantId = req.body.variantId || null;


    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    const exists = wishlist.products.some(
      (item) => item.productId.toString() === productId &&
      item.variantId?.toString() === variantId

    );

    if (!exists) {
      wishlist.products.push({ productId,variantId, addedAt: new Date(), });
      await wishlist.save();
    }

    return res.json({ success: true, message: "Added to wishlist", variantId, });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Failed to add" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.id;

    const result = await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId } } }
    );

    if (result.modifiedCount === 0) {
      return res.json({ success: false, message: "Product not in wishlist" });
    }

    return res.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return res.json({ success: false, message: "Failed to remove" });
  }
};

const clearWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;

    await Wishlist.findOneAndUpdate({ userId }, { $set: { products: [] } });

    req.session.successMessage = "Wishlist cleared";
    res.redirect("/wishlist");
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    req.session.errorMessage = "Could not clear wishlist";
    res.redirect("/wishlist");
  }
};

const addAllToCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist || wishlist.products.length === 0) {
      req.session.message = "Your wishlist is empty.";
      req.session.messageType = "error";
      return res.redirect("/wishlist");
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        totalPrice: 0,
      });
    }

    for (const item of wishlist.products) {
      const productId = item.productId;
      const variantId = item.variantId || null;
      const quantity = 1; // Default quantity when adding from wishlist

      const product = await Product.findById(productId).populate("category");
      if (!product) continue;
      if (!product.status || !product.category?.status) continue;
      if (product.totalStock <= 0) continue;

      const existingIndex = cart.items.findIndex(
        (cartItem) =>
          cartItem.product.toString() === productId.toString() &&
          (cartItem.variantId?.toString() || null) ===
            (variantId?.toString() || null)
      );

      if (existingIndex > -1) {
        let newQty = cart.items[existingIndex].quantity + quantity;

        const MAX_LIMIT = 6;
        if (newQty > MAX_LIMIT) newQty = MAX_LIMIT;
        if (newQty > product.totalStock) newQty = product.totalStock;

        cart.items[existingIndex].quantity = newQty;
      } else {
        cart.items.push({
          product: productId,
          variantId: variantId,
          quantity: 1,
        });
      }
    }

    // Recalculate total price
    await cart.populate({
      path: "items.product",
      populate: {
        path: "category",
      },
    });

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );

    await cart.save();

    // OPTIONAL → Clear wishlist after adding
    wishlist.products = [];
    await wishlist.save();

    req.session.message = "All items added to cart.";
    req.session.messageType = "success";

    return res.redirect("/cart");
  } catch (error) {
    console.error("Error in addAllToCart:", error);
    req.session.message = "Failed to add all items.";
    req.session.messageType = "error";
    return res.redirect("/wishlist");
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  addAllToCart  
};
