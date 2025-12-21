const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin/adminController");
const categoryController = require("../controller/admin/categoryController");
const userManageController = require("../controller/admin/userManageController");
const productController = require("../controller/admin/productController");
const adminOrderController = require("../controller/admin/adminOrderController");
const couponController = require("../controller/admin/couponController");
const OfferController = require("../controller/admin/offerController");
const salesController = require("../controller/admin/salesReportController");

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

router.get("/orders", auth.isAdminLoggedIn,adminOrderController.loadOrders);
router.post("/orders/update-status/:id", adminOrderController.updateOrderStatus);


router.post("/order/:orderId/accept-return", auth.isAdminLoggedIn, adminOrderController.acceptReturn);
router.post("/order/:orderId/reject-return", auth.isAdminLoggedIn, adminOrderController.rejectReturn);


router.get("/couponManage",auth.isAdminLoggedIn, couponController.loadCouponList);
router.get("/coupon/add", auth.isAdminLoggedIn, couponController.loadAddCoupon)
router.post("/coupon/add", auth.isAdminLoggedIn,couponController.addCoupon);
router.get("/coupon/edit/:id",auth.isAdminLoggedIn ,couponController.loadEditCoupon);
router.patch("/coupon/edit", auth.isAdminLoggedIn, couponController.editCoupon);
router.patch("/coupon/toggle/:id",auth.isAdminLoggedIn , couponController.toggleCouponStatus);

router.get("/offerManage",auth.isAdminLoggedIn, OfferController.loadOfferManage);
router.get("/offer/add",auth.isAdminLoggedIn, OfferController.loadAddOfferPage)
router.post("/offer/add",auth.isAdminLoggedIn, OfferController.addOffer);
router.get("/offer/edit/:id", auth.isAdminLoggedIn, OfferController.loadEditOffer);
router.post("/offer/edit", auth.isAdminLoggedIn,OfferController.updateOffer);
router.patch("/offer/toggle/:id",auth.isAdminLoggedIn, OfferController.toggleOfferStatus);

router.get("/sales-report", auth.isAdminLoggedIn, salesController.loadSalesReport);



router.get("/logout", adminController.logout);

module.exports = router;
