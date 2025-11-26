const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const mongoose = require("mongoose");

const bcrypt = require("bcrypt");

// HOME

const loadHome = async (req, res) => {
  try {
    const userId = req.session.userId;
    let user = null;

    if (userId) {
      user = await User.findById(userId);
    }

    const products = await Product.find({ status: true }).populate({
      path: "category",
      match: { status: true },
      select: "name description ",
    });

    const filteredProducts = products.filter((p) => p.category !== null);

    console.log(products);

    res.render("home", { user, products: filteredProducts });
  } catch (error) {
    console.log("error loading home page", error);
  }
};

const loadSingleProduct = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log(userId);
    const { productId } = req.params;

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

    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: productId },
      status: true,
    })
      .limit(4)
      .lean();

    console.log("Loaded product:", product);

    // Pass the related products to the EJS template
    res.render("productDetails", { product, relatedProducts });
  } catch (error) {
    console.error("Error loading single product:", error);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};

const loadShop = async (req, res) => {
  try {
    const userId = req.session.userId;
    let user = null;

    if (userId) {
      user = await User.findById(userId).lean();
      ``;
    }

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
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Category.find({ status: true }).lean();

    // 4. Get the maximum price for the slider
    const maxProductPrice = await Product.findOne({ status: true })
      .sort({ price: -1 })
      .select("price")
      .lean();

    res.render("shop", {
      user,
      products: filteredProducts,
      categories,
      totalPages,
      currentPage: page,
      search,
      maxPrice,
      activeCategory: categoryId,
      activeSort: sortOption,
      maxPriceValue: maxProductPrice ? maxProductPrice.price : 0,
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
