const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Wishlist = require("../../models/wishlistModel")
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const sendEmail = require("../../utils/sendEmail");

const bcrypt = require("bcrypt");

const loadWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.session.user._id })
      .populate('products.productId');

    const products = wishlist?.products.map(item => item.productId) || [];

    res.render('wishlist', { products }); 
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.render('wishlist', { products: [] });
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

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId } } }
    );

    req.session.successMessage = "Removed from wishlist";

 
    return res.redirect("/wishlist");

  } catch (error) {
    console.error("Error removing from wishlist:", error);

    req.session.errorMessage = "Failed to remove";
    return res.redirect("/wishlist");
  }
};



const clearWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;

    await Wishlist.findOneAndUpdate(
      { userId },
      { $set: { products: [] } }
    );

    req.session.successMessage = "Wishlist cleared";
    res.redirect('/wishlist');

  } catch (error) {
    console.error("Error clearing wishlist:", error);
    req.session.errorMessage = "Could not clear wishlist";
    res.redirect('/wishlist');
  }
};
module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
}

