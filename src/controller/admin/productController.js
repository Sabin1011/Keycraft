const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const cloudinary = require("../../config/cloudinary");
const uploadToCloudinary = require("../../utils/cloudinaryUpload")
const fs = require("fs");

const loadAdminProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };
    }

    const totalProducts = await Product.countDocuments(searchQuery);


    const products = await Product.find(searchQuery)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const price = products.price;
    const allCategories = await Category.find({});

    res.render("adminProduct", {
      activePage:"product",
      products,
      allCategories,
      searchQuery,
      currentPage: page,
      totalProducts,
      limit,
      price,
      search,
      success: req.session.success,
      error: req.session.error,
    });

    delete req.session.success;
    delete req.session.error;
  } catch (error) {
    console.error("Error loading products page:", error);
    res.status(500).send("Error loading products page.");
  }
};

const loadAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ status: true });
    res.render("adminAddProduct", { 
      activePage:"product",
      errors: {},   
      productName: "",
      price: "",
      description: "",
      category: "",
      variantName: [],
      variantQty: [],
      categories
    });


  } catch (error) {
    console.log("Error loading add product page:", error);
  }
};

const AddProduct = async (req, res) => {
  try {
    const {
      productName,
      price,
      description,
      category,
      variantName,
      variantQty,
    } = req.body;


    const errors={};

     if (!productName || productName.trim() === "") {
      errors.productName = "Product name is required.";
    } else if (productName.trim().length < 2 || productName.trim().length > 100) {
      errors.productName = "Product name must be between 2 and 100 characters.";
    }

    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      errors.price = "Price must be a positive number.";
    }
    
    if (!description || description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters long.";
    }

    if (!category || category.trim() === "") {
      errors.category = "Category is required.";
    }
    
    const exist = await Product.findOne({
      name: { $regex: new RegExp(`^${productName.trim()}$`, "i") },
    });

    if (exist) {
      errors.productName = `Product '${productName.trim()}' already exists.`;
    }


    if (Object.keys(errors).length > 0) {
      return res.render("adminAddProduct", {
        errors,
        productName,
        price,
        description,
        category,
        variantName,
        variantQty,
        categories: await Category.find({}) 
      });
    }

    let cloudinaryImages = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });

        cloudinaryImages.push(result.secure_url);
      }
    }


    const variants = [];
    if (variantName && variantQty) {
      const names = Array.isArray(variantName) ? variantName : [variantName];
      const quantities = Array.isArray(variantQty) ? variantQty : [variantQty];

      for (let i = 0; i < names.length; i++) {
        if (names[i] && quantities[i] !== "") {
          variants.push({
            name: names[i],
            quantity: parseInt(quantities[i]) || 0,
          });
        }
      }
    }

    const product = new Product({
      name: productName.trim(),
      price: parseFloat(price),
      description,
      category,
      images: cloudinaryImages,
      variants,
    });

    await product.save();

    // console.log("FILES:", req.files);
    return res.status(200).json({
      success: true,
      message: "Product added successfully!",
    });
  } catch (error) {
    console.error("Error adding product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while adding product.",
    });
  }
};  

const loadEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    let product = await Product.findById(productId).populate({
      path: "category",
      select: "name",
    });

    if (!product) {
      return res.status(404).render("error", { message: "Product not found" });
    }

    const categories = await Category.find({ status: true });

    res.render("adminEditProduct", {
      activePage: "product",
      product,
      categories,
    });
  } catch (err) {
    console.error("Error loading edit product:", err);
    res.status(500).render("error", { message: "Error loading product" });
  }
};


const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const {
      productName,
      description,
      price,
      category,
      variantName,
      variantQty,
    } = req.body;

    let existingImages = [];
    if (req.body['existingImages[]']) {
      existingImages = Array.isArray(req.body['existingImages[]']) 
        ? req.body['existingImages[]'] 
        : [req.body['existingImages[]']];
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variants = [];
    if (Array.isArray(variantName) && Array.isArray(variantQty)) {
      for (let i = 0; i < variantName.length; i++) {
        if (variantName[i].trim() !== "") {
          variants.push({
            name: variantName[i],
            quantity: parseInt(variantQty[i]) || 0,
          });
        }
      }
    }

    const totalStock = variants.reduce((s, v) => s + v.quantity, 0);

    let finalImages = [];


    if(existingImages.length > 0){
      finalImages = [...existingImages];
    }


    if(req.files && req.files.length > 0){
      for(const files of req.files) {
        const result = await new Promise((resolve, reject) =>{
          cloudinary.uploader.upload_stream(
            {folder:"products"},
            (error, result)=>{
              if(error) reject(error);
              else resolve(result)
            }
          ).end(files.buffer)
        });

        finalImages.push(result.secure_url);
      }
    }

    product.name = productName;
    product.description = description;
    product.price = price;
    product.category = category;
    product.variants = variants;
    product.stock = totalStock;
    product.images = finalImages;

    await product.save();
    
    return res.redirect("/admin/adminProduct");
    
  } catch (err) {
    console.error("Error updating product:", err);
    return res.status(500).json({
      success: false,
      message: "Error updating product",
    });
  }
};

const toggleProductStatus = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    product.status = !product.status;
    await product.save();

    return res.json({
      success: true,
      message: product.status ? "Product unblocked." : "Product blocked.",
      status: product.status,
    });
  } catch (error) {
    console.error("Error toggling product status:", error);
    res.status(500).redirect("/admin/products");
  }
};

module.exports = {
  loadAdminProduct,
  loadAddProduct,
  loadEditProduct,
  AddProduct,
  toggleProductStatus,
  updateProduct,
};
