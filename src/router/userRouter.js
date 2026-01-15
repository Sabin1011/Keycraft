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

router.get("/register", authController.loadRegister);
router.post("/register", authController.register);

router.get("/otp", authController.loadOtp);
router.post("/verify-otp", authController.verifyOtp);
router.get("/resend-otp", authController.resendOtp);

router.get("/login", auth.isLogged, authController.loadLogin);
router.post("/login", authController.login);

router.get("/", userController.loadHome);

router.get("/forgot-password", authController.loadForgotPassword);
router.post("/forgot-password/send-otp", authController.emailVerification);
router.get("/forgot-password/otp", authController.forgotPasswordOtpPage);
router.get("/forgot-password/verify-otp", authController.loadforgototp);
router.post("/forgot-password/verify-otp", authController.verifyForgotOtp);
router.post("/reset-password-success", authController.resetPassword);
router.get("/forgotNewPassword", authController.loadEnterNewPassword);
router.get(
  "/forgot-password/resend-otp",
  authController.resendForgotPasswordOtp
);

router.get("/shop", auth.isLoggedIn, userController.loadShop);

router.get(
  "/singleProduct/:productId",
  auth.isLoggedIn,
  userController.loadSingleProduct
);

router.get("/profile", auth.isLoggedIn, userProfileController.loadprofile);

router.get(
  "/profile/address/add",
  auth.isLoggedIn,
  userProfileController.loadAddAddress
);
router.post(
  "/profile/address/add",
  auth.isLoggedIn,
  userProfileController.saveAddress
);
router.patch(
  "/profile/address/:id/set-default",
  auth.isLoggedIn,
  userProfileController.setDefaultAddress
);
router.get(
  "/profile/address/:id/edit",
  auth.isLoggedIn,
  userProfileController.loadEditAddress
);

router.patch(
  "/profile/address/:id/edit",
  auth.isLoggedIn,
  userProfileController.editAddressPatch
);
router.delete(
  "/profile/address/:id/delete",
  auth.isLoggedIn,
  userProfileController.deleteAddress
);

router.get(
  "/profile/change-password",
  auth.isLoggedIn,
  userProfileController.loadChangePassword
);
router.patch(
  "/profile/change-password",
  auth.isLoggedIn,
  userProfileController.changePassword
);

router.get(
  "/profile/edit",
  auth.isLoggedIn,
  editProfileController.loadEditProfilePage
);
router.patch(
  "/profile/edit",
  auth.isLoggedIn,
  profileUpload.single("profileImage"),
  editProfileController.updateProfile
);

router.get(
  "/profile/edit-profile/verify-otp",
  auth.isLoggedIn,
  editProfileController.loadEmailOTPPage
);
router.post(
  "/profile/edit-profile/verify-otp",
  auth.isLoggedIn,
  editProfileController.verifyEmailOTP
);

router.get("/wishlist", auth.isLoggedIn, wishlistController.loadWishlist);
router.post(
  "/wishlist/add/:id",
  auth.isLoggedIn,
  wishlistController.addToWishlist
);

router.delete(
  "/wishlist/remove/:id",
  auth.isLoggedIn,
  wishlistController.removeFromWishlist
);
router.post(
  "/wishlist/add-all-to-cart",
  auth.isLoggedIn,
  wishlistController.addAllToCart
);

router.get("/cart", auth.isLoggedIn, cartController.loadCart);
router.post("/cart/add/:id", auth.isLoggedIn, cartController.addToCart);
router.patch(
  "/cart/increase/:id",
  auth.isLoggedIn,
  cartController.increaseQuantity
);
router.patch(
  "/cart/decrease/:id",
  auth.isLoggedIn,
  cartController.decreaseQuantity
);
router.delete(
  "/cart/remove/:id",
  auth.isLoggedIn,
  cartController.removeFromCart
);

router.patch(
  "/checkout/select-address",
  auth.isLoggedIn,
  userProfileController.selectAddress
);
router.get("/checkout", auth.isLoggedIn, checkoutController.loadCheckout);

router.post(
  "/proceedToCheckout",
  auth.isLoggedIn,
  checkoutController.placeOrder
);
router.get(
  "/order-success",
  auth.isLoggedIn,
  checkoutController.loadSuccessPage
);
router.get(
  "/payment-failed",
  auth.isLoggedIn,
  checkoutController.loadPaymentFailed
);
router.get(
  "/retry-payment/:orderId",
  auth.isLoggedIn,
  checkoutController.retryPayment
);

router.get("/my-orders", auth.isLoggedIn, orderController.loadMyOrders);
router.get("/order/:id", auth.isLoggedIn, orderController.loadOrderDetails);
router.post("/place-order", auth.isLoggedIn, checkoutController.placeOrder);
router.post(
  "/verify-payment",
  auth.isLoggedIn,
  checkoutController.verifyRazorpayPayment
);

router.patch(
  "/order/:orderId/cancel",
  auth.isLoggedIn,
  orderController.cancelOrder
);
router.patch(
  "/order/:orderId/return",
  auth.isLoggedIn,
  orderController.returnOrder
);
router.patch(
  "/order/:orderId/cancel-item/:itemId",
  auth.isLoggedIn,
  orderController.cancelOrderItem
);

router.patch(
  "/order/:orderId/return-item/:itemId",
  auth.isLoggedIn,
  orderController.returnOrderItem
);

router.get(
  "/order/:orderId/invoice",
  auth.isLoggedIn,
  orderController.viewInvoice
);
router.get(
  "/order/:orderId/invoice/downlaod",
  auth.isLoggedIn,
  orderController.downloadInvoice
);
router.get("/logout", auth.isLoggedIn, userController.userLogout);

router.post(
  "/coupon/validate",
  auth.isLoggedIn,
  couponController.validateCoupon
);

router.get(
  "/order/:orderId/cancel-preview/:itemId",
  auth.isLoggedIn,
  orderController.cancelPreview
);

router.get("/wallet", auth.isLoggedIn, walletController.loadWalletPage);

router.post(
  "/cart/validate-stock",
  auth.isLoggedIn,
  checkoutController.validateCartStock
);
router.get(
  "/returned-orders",
  auth.isLoggedIn,
  orderController.loadReturnedOrders
);

router.get("/about", aboutController.loadAbout);

module.exports = router;
