const User = require("../../models/userSchema");
const Product = require("../../models/productSchema")

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


// SHOP PAGE
const loadShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const search = req.query.search || "";
        const maxPrice = req.query.maxPrice || 999999;

        const filter = {
            status: true,
            price: { $lte: maxPrice },
            name: { $regex: search, $options: "i" }
        };

        const products = await Product.find(filter)
            .populate("category", "name")
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        const maxProductPrice = await Product.findOne({ status: true })
            .sort({ price: -1 })
            .select("price")
            .lean();

        res.render("shop", {
            products,
            totalPages,
            currentPage: page,
            search,
            maxPrice,
            maxPriceValue: maxProductPrice ? maxProductPrice.price : 0
        });
    } catch (err) {
        console.log("Error loading shop:", err);
        res.status(500).send("Error loading shop page");
    }
};




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