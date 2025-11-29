const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Wishlist = require("../../models/wishlistModel");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const sendEmail = require("../../utils/sendEmail");

const bcrypt = require("bcrypt");

const loadWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      userId: req.session.user._id,
    }).populate({
      path: "products.productId",
      populate: { path: "category", select: "name status" },
    });

    let products = wishlist?.products || [];

    res.render("wishlist", { products });
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.render("wishlist", { products: [] });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.id;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    const exists = wishlist.products.some(
      (item) => item.productId.toString() === productId
    );

    if (!exists) {
      wishlist.products.push({ productId });
      await wishlist.save();
    }

    return res.json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Failed to add" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
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
    const userId = req.session.user._id;

    await Wishlist.findOneAndUpdate({ userId }, { $set: { products: [] } });

    req.session.successMessage = "Wishlist cleared";
    res.redirect("/wishlist");
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    req.session.errorMessage = "Could not clear wishlist";
    res.redirect("/wishlist");
  }
};
module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};
