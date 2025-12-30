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
const dashboardController = require("../controller/admin/dashboardController");

const {upload} = require("../middleware/multer");
const cloudinary = require("../config/cloudinary")

const Product = require("../models/productSchema");
const category = require("../models/categorySchema");
const Users = require("../models/userSchema");

const auth = require("../middleware/auth");

router.get("/login", auth.adminLogoutCheck, adminController.loadLogin);
router.post("/adminlogin", adminController.adminlogin);

router.get("/category", auth.adminAuth, categoryController.loadCategory);

router.get(
  "/addCategory",
  auth.adminAuth,
  categoryController.loadAddCategory
);
router.post("/addcategory", categoryController.addCategory);

router.get(
  "/editCategory/:id",
  auth.adminAuth,
  categoryController.loadEditCategory
);

router.post("/updateCategory/:id", categoryController.updateCategory);

router.patch("/blockCategory/:id", categoryController.blockCategory);

router.get(
  "/userManage",
  auth.adminAuth,
  userManageController.loadUserManage
);

router.patch("/blockUser/:id", userManageController.blockUser);

router.get(
  "/adminProduct",
  auth.adminAuth,
  productController.loadAdminProduct
);
router.get(
  "/adminAddProduct",
  auth.adminAuth,
  productController.loadAddProduct
);

router.post(
  "/adminAddProduct",
  upload.array("images", 4),
  productController.AddProduct
);

router.get(
  "/editProduct/:id",
  auth.adminAuth,
  productController.loadEditProduct
);
router.post(
  "/updateProduct/:id",
  auth.adminAuth,
  upload.array("images", 10),
  productController.updateProduct
);

router.post(
  "/updateProduct/:id",
  upload.array("images"),
  productController.updateProduct
);

router.patch("/toggleProductStatus/:id", productController.toggleProductStatus);

router.get("/orders", auth.adminAuth,adminOrderController.loadOrders);
router.post("/orders/update-status/:id", adminOrderController.updateOrderStatus);


router.post("/order/:orderId/accept-return", auth.adminAuth, adminOrderController.acceptReturn);
router.post("/order/:orderId/reject-return", auth.adminAuth, adminOrderController.rejectReturn);


router.get("/couponManage",auth.adminAuth, couponController.loadCouponList);
router.get("/coupon/add", auth.adminAuth, couponController.loadAddCoupon)
router.post("/coupon/add", auth.adminAuth,couponController.addCoupon);
router.get("/coupon/edit/:id",auth.adminAuth,couponController.loadEditCoupon);
router.patch("/coupon/edit", auth.adminAuth, couponController.editCoupon);
router.patch("/coupon/toggle/:id",auth.adminAuth, couponController.toggleCouponStatus);

router.get("/offerManage",auth.adminAuth, OfferController.loadOfferManage);
router.get("/offer/add",auth.adminAuth, OfferController.loadAddOfferPage)
router.post("/offer/add",auth.adminAuth, OfferController.addOffer);
router.get("/offer/edit/:id", auth.adminAuth, OfferController.loadEditOffer);
router.post("/offer/edit", auth.adminAuth,OfferController.updateOffer);
router.patch("/offer/toggle/:id",auth.adminAuth, OfferController.toggleOfferStatus);

router.get("/sales-report", auth.adminAuth, salesController.loadSalesReport);
router.get("/sales-report/pdf", auth.adminAuth, salesController.downloadSalesReportPDF);

router.get("/dashboard", auth.adminAuth, dashboardController.loadDashboard);
router.get("/sales-data", auth.adminAuth, dashboardController.getSalesChartDate)
router.get("/sales-report/excel", auth.adminAuth, salesController.downloadSalesReportExcel)
router.get("/logout", adminController.logout);

module.exports = router;
