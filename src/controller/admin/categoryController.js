const Category = require("../../models/categorySchema");

// CATEGORY PAGE

const loadCategory = async (req, res) => {
  try {
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

    // Get total count for pagination
    const totalCategories = await Category.countDocuments(searchQuery);

    // Fetch categories with pagination
    const categories = await Category.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("category", {
      categories,
      currentPage: page,
      totalCategories,
      limit,
      search,
      success: req.session.success,
      error: req.session.error,
    });

    // Clear session messages after rendering
    delete req.session.success;
    delete req.session.error;
  } catch (error) {
    console.error("Error loading categories page:", error);
    res.status(500).render("category", {
      categories: [],
      currentPage: 1,
      totalCategories: 0,
      limit: 10,
      search: "",
      error: "Failed to load categories",
    });
  }
};
    
// CATEGORY PAGE:
// const category = async(req, res)=>{
//     try {

//     } catch (error) {

//     }
// }

// ADD CATEGORY PAGE
const loadAddCategory = async (req, res) => {
  try {
    res.render("addCategory");
  } catch (error) {
    console.log("error rendering the addcategory page", error);
  }
};

// LOAD ADD CATEGORY

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check duplicate (case-insensitive)
    const exist = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") }
    });

    if (exist) {
      return res.render("addCategory", {
        message: "Category already available",
        name,
        description
      });
    }

    // If new category → save
    const category = new Category({ name, description });
    await category.save();

    res.redirect("/admin/category");

  } catch (error) {
    console.log("Error adding category:", error);
  }
};


// EDIT CATEGORY PAGE

const loadEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findOne({ _id: categoryId });
    console.log(category);
    res.render("editCategory", { category });
  } catch (error) {
    console.log("error rendering the edit Category page ", error);
  }
};

const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;
    const category = await Category.updateOne(
      { _id: categoryId },
      { name, description }
    );

    res.redirect("/admin/category");
  } catch (error) {}
};

const blockCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId)
    if(!category){
        return res.status(404).json({success: false, message:"category not found"});

    }
    // toggle status;

    category.status = !category.status;
    await category.save();
    

    res.json({
        success: true,
        message: `Category ${category.status ? "unblocked": "blocked"}  successfully`,
        newStatus: category.status,
    });


  } catch (error) {
     console.error("Error toggling category:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  loadCategory,
  loadEditCategory,
  loadAddCategory,
  addCategory,
  updateCategory,
  blockCategory,
};
