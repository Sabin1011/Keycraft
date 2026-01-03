const express = require("express");
const router = express.Router();
const userController = require("../controller/user/userController");
const authController = require("../controller/user/authController");
const editProfileController = require("../controller/user/editProfileController");
const userProfileController = require("../controller/user/userProfileController");
const wishlistController = require("../controller/user/wishlistController");
const cartController = require("../controller/user/cartController");
const orderController = require("../controller/user/orderController");
const checkoutController = require("../controller/user/checkoutController");
const couponController = require("../controller/admin/couponController.js");
const walletController = require("../controller/user/walletController.js");
const aboutController = require("../controller/user/aboutController.js");
const auth = require("../middleware/auth");
const { profileUpload } = require("../middleware/multer");

// Register Routes
router.get("/register", authController.loadRegister);
router.post("/register", authController.register);

router.get("/otp", authController.loadOtp);
router.get("/verify-otp", authController.verifyOtp);
router.post("/verify-otp", authController.verifyOtp);
router.get("/resend-otp", authController.resendOtp);

router.get("/login", auth.isLogged, authController.loadLogin);
router.post("/login", authController.login);

router.get("/", userController.loadHome);
router.get("/home", userController.loadHome);

router.get("/forgot-password", authController.loadForgotPassword);
router.post("/forgot-password/send-otp", authController.emailVerification);
router.get("/forgot-password/otp", authController.forgotPasswordOtpPage);
router.get("/forgot-password/verify-otp", authController.loadforgototp);
router.post("/forgot-password/verify-otp", authController.verifyForgotOtp);
router.post("/reset-password-success", authController.resetPassword);
router.get("/forgotNewPassword", authController.loadEnterNewPassword);

router.use(auth.isLoggedIn);

router.get("/shop", userController.loadShop);

router.get(
  "/singleProduct/:productId",

  userController.loadSingleProduct
);

router.get("/profile", userProfileController.loadprofile);

router.get("/profile/address/add", userProfileController.loadAddAddress);
router.post("/profile/address/add", userProfileController.saveAddress);
router.post(
  "/profile/address/:id/set-default",
  userProfileController.setDefaultAddress
);
router.get("/profile/address/:id/edit", userProfileController.loadEditAddress);
router.post("/profile/address/:id/edit", userProfileController.editAddressPost);
router.post("/profile/address/:id/delete", userProfileController.deleteAddress);
  
router.get(
  "/profile/change-password",
  userProfileController.loadChangePassword
);
router.post("/profile/change-password", userProfileController.changePassword);

router.get("/profile/edit", editProfileController.loadEditProfilePage);
router.post(
  "/profile/edit",
  profileUpload.single("profileImage"),
  editProfileController.updateProfile
);

router.get(
  "/profile/edit-profile/verify-otp",
  editProfileController.loadEmailOTPPage
);
router.post(
  "/profile/edit-profile/verify-otp",
  editProfileController.verifyEmailOTP
);

router.get("/wishlist", wishlistController.loadWishlist);
router.post("/wishlist/add/:id", wishlistController.addToWishlist);
router.post("/wishlist/remove/:id", wishlistController.removeFromWishlist);
router.post("/wishlist/add-all-to-cart", wishlistController.addAllToCart);

router.get("/cart", cartController.loadCart);
router.post("/cart/add/:id", cartController.addToCart);
router.post("/cart/increase/:id", cartController.increaseQuantity);
router.post("/cart/decrease/:id", cartController.decreaseQuantity);
router.post("/cart/remove/:id", cartController.removeFromCart);

router.post("/checkout/select-address", userProfileController.selectAddress);
router.get("/checkout", checkoutController.loadCheckout);

router.post("/proceedToCheckout", checkoutController.placeOrder);
router.get("/order-success", checkoutController.loadSuccessPage);

router.get("/my-orders", orderController.loadMyOrders);
router.get("/order/:id", orderController.loadOrderDetails);
router.post("/place-order", checkoutController.createRazorpayOrder);

router.post("/verify-payment", checkoutController.verifyRazorpayPayment);

router.post("/order/:orderId/cancel", orderController.cancelOrder);
router.post("/order/:orderId/return", orderController.returnOrder);
router.post(
  "/order/:orderId/cancel-item/:itemId",
  orderController.cancelOrderItem
);
router.post(
  "/order/:orderId/return-item/:itemId",
  orderController.returnOrderItem
);

router.get("/order/:orderId/invoice", orderController.viewInvoice);
router.get("/order/:orderId/invoice/downlaod", orderController.downloadInvoice);
router.get("/logout", userController.userLogout);

router.post("/coupon/validate", couponController.validateCoupon);

router.get(
  "/order/:orderId/cancel-preview/:itemId",
  orderController.cancelPreview
);

router.get("/payment-failed", checkoutController.loadPaymentFailed);

router.get("/retry-payment", checkoutController.retryPayment);

router.get("/wallet", walletController.loadWalletPage);

router.post("/cart/validate-stock", checkoutController.validateCartStock);

router.get("/about", aboutController.loadAbout);

module.exports = router;
