const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");

// =======================
// LOAD PRODUCT PAGE
// =======================
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
                    { description: { $regex: search, $options: "i" } }
                ]
            };
        }

        const totalProducts = await Product.countDocuments(searchQuery);

        const products = await Product.find(searchQuery)
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const allCategories = await Category.find({});

        res.render("adminProduct", {
            products,
            allCategories,
            searchQuery,
            currentPage: page,
            totalProducts,
            limit,
            search,
            success: req.session.success,
            error: req.session.error
        });

        delete req.session.success;
        delete req.session.error;

    } catch (error) {
        console.error("Error loading products page:", error);
        res.status(500).send("Error loading products page.");
    }
};

// =======================
// LOAD ADD PRODUCT PAGE
// =======================
const loadAddProduct = async (req, res) => {
    try {
        const categories = await Category.find({ status: true });
        res.render("adminAddProduct", { categories });
    } catch (error) {
        console.log("Error loading add product page:", error);
    }
};

// =======================
// ADD PRODUCT
// =======================
const AddProduct = async (req, res) => {
    try {
        const { productName, price, description, category, variantName, variantQty } = req.body;

        if (!productName || !price || !description || !category) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be filled."
            });
        }

        const exist = await Product.findOne({
            name: { $regex: new RegExp(`^${productName.trim()}$`, "i") }
        });

        if (exist) {
            return res.status(409).json({
                success: false,
                message: `Product '${productName.trim()}' already exists.`
            });
        }

        const variants = [];
        if (variantName && variantQty) {
            const names = Array.isArray(variantName) ? variantName : [variantName];
            const quantities = Array.isArray(variantQty) ? variantQty : [variantQty];

            for (let i = 0; i < names.length; i++) {
                if (names[i] && quantities[i] !== "") {
                    variants.push({
                        name: names[i],
                        quantity: parseInt(quantities[i]) || 0
                    });
                }
            }
        }

        const imagePaths = req.files
            ? req.files.map((file) => "/uploads/products/" + file.filename)
            : [];

        const product = new Product({
            name: productName.trim(),
            price: parseFloat(price),
            description,
            category,
            images: imagePaths,
            variants
        });

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product added successfully!"
        });

    } catch (error) {
        console.error("Error adding product:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while adding product."
        });
    }
};

// =======================
// LOAD EDIT PRODUCT PAGE
// =======================
const loadEditProduct = async (req, res) => {
    try {
        res.render("adminEditProduct");
    } catch (error) {
        console.log("Error loading edit product page:", error);
    }
};

// =======================
// TOGGLE PRODUCT STATUS
// =======================
const toggleProductStatus = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        product.status = !product.status;
        await product.save();

        return res.json({
            success: true,
            message: product.status ? "Product unblocked." : "Product blocked.",
            status: product.status
        });

    } catch (error) {
        console.error("Error toggling product status:", error);
        res.status(500).redirect('/admin/products');
    }
};


module.exports = {
    loadAdminProduct,
    loadAddProduct,
    loadEditProduct,
    AddProduct,
    toggleProductStatus

}