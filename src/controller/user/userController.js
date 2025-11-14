const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const mongoose = require('mongoose')

const bcrypt = require("bcrypt");





// HOME 

const loadHome = async(req, res)=>{
    try{
        const userId = req.session.userId;
        let user = null;

        if(userId){
            user = await User.findById(userId)
        }

        const products = await Product.find({status:true}).populate('category',"name description ")
        console.log(products)

        res.render("home", {user, products});
    } catch(error){
        console.log("error loading home page", error);
    }
}


const loadSingleProduct = async (req, res) => {

  try {
    const userId = req.session.userId;
    console.log(userId)
    const { productId } = req.params;

    if (!productId) {
      return res.redirect("/"); 
    }

    const product = await Product.findById(productId)
      .populate("category", "name description status");

    if (!product) {
      return res.status(404).render("404", { message: "Product not found" });
    }

    console.log("Loaded product:", product);
    res.render("productDetails", { product }); 
  } catch (error) {
    console.error("Error loading single product:", error);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};



const loadShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const search = req.query.search || "";
        const maxPrice = req.query.maxPrice || 999999;
        const categoryId = req.query.category || ""; 

        let filter = {
            status: true,
            price: { $lte: maxPrice },
        };

        // Add search filter (by name)
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }
        
        // NEW: Add category filter
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            filter.category = categoryId;
        }


        // 1. Fetch filtered and paginated products
        const products = await Product.find(filter)
            .populate("category", "name")
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // 2. Count total products for pagination
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // 3. Get all active categories for the sidebar
        const categories = await Category.find({ status: true }).lean();

        // 4. Get the maximum price for the slider (unchanged)
        const maxProductPrice = await Product.findOne({ status: true })
            .sort({ price: -1 })
            .select("price")
            .lean();

        res.render("shop", {
            products,
            categories, // NEW: Pass categories to the EJS
            totalPages,
            currentPage: page,
            search,
            maxPrice,
            activeCategory: categoryId, // NEW: Pass active category ID
            maxPriceValue: maxProductPrice ? maxProductPrice.price : 0
        });

    } catch (err) {
        console.log("Error loading shop:", err);
        res.status(500).send("Error loading shop page");
    }
};

// module.exports = { loadShop, ... }



// PRODUCTDETAILS

const loadProductDetails = async(req, res)=>{
    try{
        res.render("productDetails");
    } catch(error){
        console.log("error loading product details page", error)
    }
}

module.exports = {
    loadHome,
    loadShop,
    loadProductDetails,
    loadSingleProduct,
}