const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Wishlist = require("../../models/wishlistModel");
const Offer = require("../../models/offerSchema");
const Cart = require("../../models/cartModel");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const sendEmail = require("../../utils/sendEmail");

const bcrypt = require("bcrypt");


const loadHome = async (req, res) => {
  try {
    const userId = req.session.userId;

    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() },
    });

    let user = null;
    let wishlistProductIds = [];
    const cart = await Cart.findOne({ userId });
    let cartCount = 0;

    if (userId) {
      user = await User.findById(userId);
      if (cart && cart.items) {
        cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      }

      const wishlist = await Wishlist.findOne({ userId });
      if (wishlist) {
        wishlistProductIds = wishlist.products.map((p) =>
          p.productId.toString()
        );
      }
    }

    const products = await Product.find({ status: true }).populate({
      path: "category",
      match: { status: true },
      select: "name description ",
    });

    const filteredProducts = products.filter((p) => p.category !== null);

    const productWithOffers = filteredProducts.map((product) => {
      const applicableOffers = [];

      const productOffers = offers.filter(
        (offer) =>
          offer.offerType === "product" &&
          offer.productIds.some(
            (id) => id.toString() === product._id.toString()
          )
      );
      applicableOffers.push(...productOffers);

      const categoryOffers = offers.filter(
        (offer) =>
          offer.offerType === "category" &&
          offer.categoryIds.some(
            (id) => id.toString() === product.category._id.toString()
          )
      );
      applicableOffers.push(...categoryOffers);

      let bestOffer = null;
      let discountedPrice = product.price;
      let discountAmount = 0;

      if (applicableOffers.length > 0) {
        applicableOffers.forEach((offer) => {
          let calculatedDiscount = 0;

          if (offer.discountType === "percentage") {
            calculatedDiscount = (product.price * offer.discountValue) / 100;

            if (
              offer.maxDiscountAmount &&
              calculatedDiscount > offer.maxDiscountAmount
            ) {
              calculatedDiscount = offer.maxDiscountAmount;
            }
          } else if (offer.discountType === "flat") {
            calculatedDiscount = offer.discountValue;
          }

          if (calculatedDiscount > discountAmount) {
            discountAmount = calculatedDiscount;
            bestOffer = offer;
          }
        });

        discountedPrice = product.price - discountAmount;
      }

      return {
        ...product.toObject(),
        originalPrice: product.price,
        discountedPrice: discountedPrice,
        discountAmount: discountAmount,
        discountPercentage:
          product.price > 0
            ? Math.round((discountAmount / product.price) * 100)
            : 0,
        hasOffer: bestOffer !== null,
        offerDetails: bestOffer
          ? {
              title: bestOffer.title,
              description: bestOffer.description,
              offerType: bestOffer.offerType,
              discountType: bestOffer.discountType,
            }
          : null,
      };
    });
    res.render("home", {
      user,
      products: productWithOffers,
      wishlistProductIds,
      cartCount,
    });
  } catch (error) {
    console.log("error loading home page", error);
  }
};

const loadSingleProduct = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    console.log(userId);
    const { productId } = req.params;

    const selectedVariantId = req.query.variant || null;

    if (!productId) {
      return res.redirect("/");
    }

    const product = await Product.findById(productId).populate(
      "category",
      "name description status"
    );

    if (!product) {
      return res.status(404).render("404", { message: "Product not found" });
    }

    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() },
    });

    const applicableOffers = [];

    const productOffers = offers.filter(
      (offer) =>
        offer.offerType === "product" &&
        offer.productIds.some((id) => id.toString() === product._id.toString())
    );
    applicableOffers.push(...productOffers);

    const categoryOffers = offers.filter(
      (offer) =>
        offer.offerType === "category" &&
        offer.categoryIds.some(
          (id) => id.toString() === product.category._id.toString()
        )
    );
    applicableOffers.push(...categoryOffers);

    let bestOffer = null;
    let discountAmount = 0;
    let discountedPrice = product.price;

    if (applicableOffers.length > 0) {
      applicableOffers.forEach((offer) => {
        let calculatedDiscount = 0;

        if (offer.discountType === "percentage") {
          calculatedDiscount = (product.price * offer.discountValue) / 100;

          if (
            offer.maxDiscountAmount &&
            calculatedDiscount > offer.maxDiscountAmount
          ) {
            calculatedDiscount = offer.maxDiscountAmount;
          }
        } else {
          calculatedDiscount = offer.discountValue;
        }

        if (calculatedDiscount > discountAmount) {
          discountAmount = calculatedDiscount;
          bestOffer = offer;
        }
      });

      discountedPrice = Math.max(product.price - discountAmount, 0);
    }

    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: productId },
      status: true,
    })
      .limit(4)
      .lean();
      
    let cartCount = 0;

    if (userId) {
      const cart = await Cart.findOne({ userId });

      if (cart && cart.items && cart.items.length > 0) {
        cartCount = cart.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
      }
    }


    const wishlist = await Wishlist.findOne({ userId: req.session.userId });
    let wishlistProductIds = [];

    if (wishlist && wishlist.products) {
      wishlistProductIds = wishlist.products.map((p) => p.productId.toString());
    }

    const productWithOffer = {
      ...product.toObject(),
      originalPrice: product.price,
      discountedPrice,
      discountAmount,
      discountPercentage:
        product.price > 0
          ? Math.round((discountAmount / product.price) * 100)
          : 0,
      hasOffer: bestOffer !== null,
      offerDetails: bestOffer
        ? {
            title: bestOffer.title,
            offerType: bestOffer.offerType,
            discountType: bestOffer.discountType,
          }
        : null,
    };

    res.render("productDetails", {
      product: productWithOffer,
      relatedProducts,
      wishlistProductIds,
      cartCount,
      user,
      selectedVariantId,
    });
  } catch (error) {
    console.error("Error loading single product:", error);
  }
};

const loadShop = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user_id;
    let user = null;

    if (userId) {
      user = await User.findById(userId).lean();
    }

    let wishlistProductIds = [];

    if (userId) {
      const wishlist = await Wishlist.findOne({ userId: userId });

      if (wishlist && wishlist.products) {
        wishlistProductIds = wishlist.products.map((p) =>
          p.productId.toString()
        );
      }
    }

    let cartCount = 0;

    if (userId) {
      const cart = await Cart.findOne({ userId });

      if (cart && Array.isArray(cart.items)) {
        cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }

    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() },
    });

    const page = parseInt(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const maxPrice = req.query.maxPrice || 999999;
    const categoryId = req.query.category || "";

    const sortOption = req.query.sort || "a-z";

    let sortCriteria = {};
    switch (sortOption) {
      case "a-z":
        sortCriteria = { name: 1 };
        break;
      case "z-a":
        sortCriteria = { name: -1 };
        break;
      case "low-high":
        sortCriteria = { price: 1 };
        break;
      case "high-low":
        sortCriteria = { price: -1 };
        break;
      default:
        sortCriteria = { name: 1 };
    }

    const activeCategoryids = await Category.find({ status: true }).distinct(
      "_id"
    );

    let filter = {
      status: true,
      price: { $lte: maxPrice },
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.category = categoryId;
    }

    const products = await Product.find(filter)
      .populate({
        path: "category",
        match: { status: true },
        select: "name",
      })
      .sort(sortCriteria)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const filteredProducts = products.filter((p) => p.category !== null);
    const productsWithOffers = filteredProducts.map((product) => {
      const applicableOffers = [];

      // Product offers
      const productOffers = offers.filter(
        (offer) =>
          offer.offerType === "product" &&
          offer.productIds.some(
            (id) => id.toString() === product._id.toString()
          )
      );

      applicableOffers.push(...productOffers);

      // Category offers
      const categoryOffers = offers.filter(
        (offer) =>
          offer.offerType === "category" &&
          offer.categoryIds.some(
            (id) => id.toString() === product.category._id.toString()
          )
      );

      applicableOffers.push(...categoryOffers);

      let bestOffer = null;
      let discountAmount = 0;
      let discountedPrice = product.price;

      if (applicableOffers.length > 0) {
        applicableOffers.forEach((offer) => {
          let calculatedDiscount = 0;

          if (offer.discountType === "percentage") {
            calculatedDiscount = (product.price * offer.discountValue) / 100;
            if (
              offer.maxDiscountAmount &&
              calculatedDiscount > offer.maxDiscountAmount
            ) {
              calculatedDiscount = offer.maxDiscountAmount;
            }
          } else {
            calculatedDiscount = offer.discountValue;
          }

          if (calculatedDiscount > discountAmount) {
            discountAmount = calculatedDiscount;
            bestOffer = offer;
          }
        });

        discountedPrice = product.price - discountAmount;
      }

      return {
        ...product,
        originalPrice: product.price,
        discountedPrice,
        discountAmount,
        discountPercentage:
          product.price > 0
            ? Math.round((discountAmount / product.price) * 100)
            : 0,
        hasOffer: bestOffer !== null,
        offerDetails: bestOffer
          ? {
              title: bestOffer.title,
              offerType: bestOffer.offerType,
              discountType: bestOffer.discountType,
            }
          : null,
      };
    });

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Category.find({ status: true }).lean();

    const maxProductPrice = await Product.findOne({ status: true })
      .sort({ price: -1 })
      .select("price")
      .lean();

    res.render("shop", {
      user,
      products: productsWithOffers,
      categories,
      totalPages,
      currentPage: page,
      search,
      maxPrice,
      activeCategory: categoryId,
      activeSort: sortOption,
      maxPriceValue: maxProductPrice ? maxProductPrice.price : 0,
      wishlistProductIds,
      cartCount,
    });
  } catch (err) {
    console.log("Error loading shop:", err);
    res.status(500).send("Error loading shop page");
  }
};

// logout

const userLogout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out");
    }

    res.clearCookie("connect.sid", {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.redirect("/login");
  });
};

module.exports = {
  loadHome,
  loadShop,
  loadSingleProduct,
  userLogout,
};
