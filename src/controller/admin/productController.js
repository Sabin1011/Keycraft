const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema")
const fs = require("fs")


// PRODUCT PAGE

const loadAdminProduct = async(req, res)=>{

    try{

        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";

   

        // Build search query

        let searchQuery = {};
        if (search) {
          searchQuery = {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          };
        }

   

        // Get total count for pagination (Renamed variable for better clarity: totalProducts)
        const totalProducts = await Product.countDocuments(searchQuery);

   

        // Fetch products with pagination and populate the 'category' field
        const products = await Product.find(searchQuery)
            // The path is 'category' (the field name in productSchema)

            // The reference name is 'categories' (the model name in categorySchema)
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

       

        // Fetch all categories (optional, only needed if your view uses a dropdown/sidebar list of all categories)

        const allCategories = await Category.find({});
        res.render("adminProduct", {

          // Use the fetched 'products' variable for rendering

          products: products,
          // Passing all categories might be useful for a dropdown filter in the view
          allCategories: allCategories,
          searchQuery,
          currentPage: page,
          totalProducts, // Use the count of products
          limit,
          search,
          success: req.session.success,
          error: req.session.error,
        });

   

        // Clear session messages after rendering

        delete req.session.success;

        delete req.session.error;



        // *** CRITICAL FIX: The following lines from your original code must be removed ***

        // *** They cause the 'Headers already sent' error ***

        /*

        const products = await Product.find();

        res.render("adminProduct",{products});

        */



    }

    catch(error){

        console.error("error loading the products page:", error); // Use console.error for clarity

        res.status(500).send("Error loading products page.");

    }

}


// ADD PRODUCT

const loadAddProduct = async(req, res)=>{
    try{
         const categories = await Category.find({status: true})
        
        res.render("adminAddProduct", {categories});
    }
    catch(error){
        console.log("error loading the add products page",error);
    }
}

// NOTE: You must ensure 'Product' and 'Category' models are correctly required.
// You might also need 'fs' or 'path' if you want to clean up partially uploaded files on error.

const AddProduct = async (req, res) => {
    try {
        const { productName, price, description, category, variantName, variantQty } = req.body;
        
        // --- 1. Basic Validation ---
        if (!productName || !price || !description || !category) {
            // For AJAX submission, return a JSON error
            return res.status(400).json({ 
                success: false, 
                message: "All required fields (Name, Price, Description, Category) must be filled." 
            });
        }

        // --- 2. Duplicate Check (Case-Insensitive) ---
        // This Mongoose query prevents duplicate product names.
        const exist = await Product.findOne({
            name: { $regex: new RegExp(`^${productName.trim()}$`, "i") }
        });

        if (exist) {
            // If the product exists, stop and return a JSON conflict error (409)
            return res.status(409).json({ 
                success: false,
                message: `Product named '${productName.trim()}' already exists. Please use a different name.`
            });
        }

        // --- 3. Handle variants (Existing Correct Logic) ---
        const variants = [];
        if (variantName && variantQty) {
            const names = Array.isArray(variantName) ? variantName : [variantName];
            const quantities = Array.isArray(variantQty) ? variantQty : [variantQty];

            for (let i = 0; i < names.length; i++) {
                if (names[i] && quantities[i] !== undefined && quantities[i] !== '') {
                    variants.push({
                        name: names[i],
                        quantity: parseInt(quantities[i]) || 0
                    });
                }
            }
        }

        // --- 4. Image Paths (Assumes Multer is set up correctly for 'images') ---
        const imagePaths = req.files ? req.files.map((file) =>
            // Ensure this path matches where your images are saved
            "/uploads/products/" + file.filename
        ) : [];
        
        // --- 5. Create Product ---
        const product = new Product({
            name: productName.trim(),
            price: parseFloat(price),
            description,
            category,
            images: imagePaths,
            variants: variants.length > 0 ? variants : []
        });

        await product.save();

        // --- 6. Success Response (JSON) ---
        return res.status(200).json({
            success: true,
            message: "Product added successfully!"
        });

    } catch (error) {
        console.error("Error adding product:", error);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred while adding the product."
        });
    }
};
// module.exports = { AddProduct }; // Don't forget to export if needed


// EDIT PRODUCT 

const loadEditProduct = async(req, res)=>{
    try{
        res.render("adminEditProduct");
    }
    catch(error){
        console.log("error rendering the edit products page ", error)
    }
}


// Toggle Product Status
const toggleProductStatus = async(req, res) => {
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
            status: product.status,
        });
        res.redirect('/admin/products');
    } catch(error) {
        console.error("Error toggling product status:", error);
        res.status(500).redirect('/admin/products');
    }
}



module.exports = {
    loadAdminProduct,
    loadAddProduct,
    loadEditProduct,
    AddProduct,
    toggleProductStatus

}