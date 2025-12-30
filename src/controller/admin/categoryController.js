const Category = require("../../models/categorySchema");

// LOAD CATEGORY PAGE

const loadCategory = async (req, res) => {
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

    const totalCategories = await Category.countDocuments(searchQuery);


    const categories = await Category.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("category", {
      activePage: "categories",
      categories,
      currentPage: page,
      totalCategories,
      limit,
      search,
      success: req.session.success,
      error: req.session.error,
    });

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

// LOAD ADD CATEGORY PAGE

const loadAddCategory = async (req, res) => {
  try {
    res.render("addCategory",{
      errors: {},    
      name: '',         
      description: ''
    });
  } catch (error) {
    console.log("Error loading add category page:", error);
  }
};

// ADD CATEGORY

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const errors ={};

    if (!name || name.trim() === "") {
      errors.name = "Category name is required.";
    } else if (name.trim().length < 2 || name.trim().length > 50) {
      errors.name = "Category name must be between 2 and 50 characters.";
    }

    if (!description || description.trim() === "") {
      errors.description = "Category description is required.";
    } else if (description.trim().length < 10 || description.trim().length > 200) {
      errors.description = "Description must be between 10 and 200 characters.";
    }

   const exist = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (exist) {
      errors.name = "Category already exists.";
    }

    if (Object.keys(errors).length > 0) {
      return res.render("addCategory", {
        errors,
        name,
        description,
      });
    }


    const category = new Category({ name: name.trim(), description: description.trim() });
    await category.save();

    res.redirect("/admin/category");
  } catch (error) {
    console.log("Error adding category:", error);
  }
};

// LOAD EDIT CATEGORY PAGE

const loadEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);
    res.render("editCategory", { category });
  } catch (error) {
    console.log("Error loading edit category page:", error);
  }
};

// UPDATE CATEGORY

const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;

    await Category.updateOne({ _id: categoryId }, { name, description });

    res.redirect("/admin/category");
  } catch (error) {
    console.log("Error updating category:", error);
  }
};

// BLOCK AND UNBLOCK CATEGORY

const blockCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.status = !category.status;
    await category.save();

    res.json({
      success: true,
      message: `Category ${
        category.status ? "unblocked" : "blocked"
      } successfully`,
      newStatus: category.status,
    });
  } catch (error) {
    console.error("Error toggling category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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
