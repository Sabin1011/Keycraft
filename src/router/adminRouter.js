const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin/adminController");
const categoryController = require("../controller/admin/categoryController");
const userManageController = require("../controller/admin/userManageController");
const productController = require("../controller/admin/productController");
const {upload} = require("../middleware/multer");
const cloudinary = require("../config/cloudinary")

const Product = require("../models/productSchema");
const category = require("../models/categorySchema");
const Users = require("../models/userSchema");

const auth = require("../middleware/auth");

router.get("/login", auth.adminLogoutCheck, adminController.loadLogin);
router.post("/adminlogin", adminController.adminlogin);

router.get("/category", auth.isAdminLoggedIn, categoryController.loadCategory);

router.get(
  "/addCategory",
  auth.isAdminLoggedIn,
  categoryController.loadAddCategory
);
router.post("/addcategory", categoryController.addCategory);

router.get(
  "/editCategory/:id",
  auth.isAdminLoggedIn,
  categoryController.loadEditCategory
);

router.post("/updateCategory/:id", categoryController.updateCategory);

router.patch("/blockCategory/:id", categoryController.blockCategory);

router.get(
  "/userManage",
  auth.isAdminLoggedIn,
  userManageController.loadUserManage
);

router.patch("/blockUser/:id", userManageController.blockUser);

router.get(
  "/adminProduct",
  auth.isAdminLoggedIn,
  productController.loadAdminProduct
);
router.get(
  "/adminAddProduct",
  auth.isAdminLoggedIn,
  productController.loadAddProduct
);

router.post(
  "/adminAddProduct",
  upload.array("images", 4),
  productController.AddProduct
);

router.get(
  "/editProduct/:id",
  auth.isAdminLoggedIn,
  productController.loadEditProduct
);
router.post(
  "/updateProduct/:id",
  auth.isAdminLoggedIn,
  upload.array("images", 10),
  productController.updateProduct
);

router.post(
  "/updateProduct/:id",
  upload.array("images"),
  productController.updateProduct
);

router.patch("/toggleProductStatus/:id", productController.toggleProductStatus);

router.get("/logout", adminController.logout);

module.exports = router;
