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
const { upload } = require("../middleware/multer");
const auth = require("../middleware/auth");

router.get("/login", auth.adminLogoutCheck, adminController.loadLogin);
router.post("/adminlogin", adminController.adminlogin);

router.use(auth.adminAuth);

router.get("/category", categoryController.loadCategory);

router.get("/addCategory", categoryController.loadAddCategory);
router.post("/addcategory", categoryController.addCategory);

router.get(
  "/editCategory/:id",

  categoryController.loadEditCategory
);

router.post("/updateCategory/:id", categoryController.updateCategory);

router.patch("/blockCategory/:id", categoryController.blockCategory);

router.get("/userManage", userManageController.loadUserManage);

router.patch("/blockUser/:id", userManageController.blockUser);

router.get("/adminProduct", productController.loadAdminProduct);
router.get(
  "/adminAddProduct",

  productController.loadAddProduct
);

router.post(
  "/adminAddProduct",
  upload.array("images", 4),
  productController.AddProduct
);

router.get("/editProduct/:id", productController.loadEditProduct);
router.post(
  "/updateProduct/:id",
  upload.array("images", 10),
  productController.updateProduct
);

router.patch("/toggleProductStatus/:id", productController.toggleProductStatus);

router.get("/orders", adminOrderController.loadOrders);
router.post(
  "/orders/update-status/:id",
  adminOrderController.updateOrderStatus
);

router.post("/order/:orderId/accept-return/:itemId", adminOrderController.acceptReturn);
router.post("/order/:orderId/reject-return/:itemId", adminOrderController.rejectReturn);

router.get("/couponManage", couponController.loadCouponList);
router.get("/coupon/add", couponController.loadAddCoupon);
router.post("/coupon/add", couponController.addCoupon);
router.get("/coupon/edit/:id", couponController.loadEditCoupon);
router.patch("/coupon/edit", couponController.editCoupon);
router.patch("/coupon/toggle/:id", couponController.toggleCouponStatus);

router.get("/offerManage", OfferController.loadOfferManage);
router.get("/offer/add", OfferController.loadAddOfferPage);
router.post("/offer/add", OfferController.addOffer);
router.get("/offer/edit/:id", OfferController.loadEditOffer);
router.post("/offer/edit", OfferController.updateOffer);
router.patch("/offer/toggle/:id", OfferController.toggleOfferStatus);

router.get("/sales-report", salesController.loadSalesReport);
router.get("/sales-report/pdf", salesController.downloadSalesReportPDF);

router.get("/dashboard", dashboardController.loadDashboard);
router.get("/sales-data", dashboardController.getSalesChartDate);
router.get("/sales-report/excel", salesController.downloadSalesReportExcel);
router.get("/logout", adminController.logout);
router.get(
  "/orders/:orderId",
  adminOrderController.loadSingleOrder
);

module.exports = router;
