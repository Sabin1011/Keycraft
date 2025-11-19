const express = require('express')
const router = express.Router()
const adminController =  require('../controller/admin/adminController');
const categoryController = require('../controller/admin/categoryController');
const userManageController = require('../controller/admin/userManageController');
const productController = require('../controller/admin/productController');
const upload = require("../middleware/multer");

const Product = require('../models/productSchema');
const category = require('../models/categorySchema');
const Users = require('../models/userSchema');

const auth=require("../middleware/auth")


router.get("/login",auth.adminLogoutCheck,adminController.loadLogin);
router.post("/adminlogin", adminController.adminlogin);

router.get("/category",auth.ifLoggedAdmin,categoryController.loadCategory);


router.get("/addCategory",auth.ifLoggedAdmin, categoryController.loadAddCategory);
router.post('/addcategory', categoryController.addCategory);

router.get("/editCategory/:id",auth.ifLoggedAdmin,categoryController.loadEditCategory);

router.post("/updateCategory/:id", categoryController.updateCategory);

router.patch("/blockCategory/:id", categoryController.blockCategory);

router.get("/userManage",auth.ifLoggedAdmin, userManageController.loadUserManage);

router.patch("/blockUser/:id", userManageController.blockUser);

router.get("/adminProduct",auth.ifLoggedAdmin, productController.loadAdminProduct);
router.get("/adminAddProduct", auth.ifLoggedAdmin,productController.loadAddProduct);


router.post("/adminAddProduct", upload.array("images",4),productController.AddProduct);

// routes/admin.js or similar


router.post('/adminAddProduct', upload.array('images'), async (req, res) => {
  const { productName, description, price, category } = req.body;
  const variantName = req.body['variantName[]'] || [];
  const variantQty = req.body['variantQty[]'] || [];
  const images = req.files.map(f => f.filename);

  // Save to DB...
  res.redirect('/admin/adminProduct');
});

router.get("/editProduct/:id", productController.loadEditProduct);
router.patch("/toggleProductStatus/:id", productController.toggleProductStatus);

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

module.exports = router;