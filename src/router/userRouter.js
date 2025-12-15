const express = require("express");
const router = express.Router();
const userController = require("../controller/user/userController");
const authController = require("../controller/user/authController");
const editProfileController = require("../controller/user/editProfileController")
const userProfileController = require("../controller/user/userProfileController")
const wishlistController = require('../controller/user/wishlistController');
const cartController = require('../controller/user/cartController');
const orderController = require('../controller/user/orderController')
const checkoutController = require('../controller/user/checkoutController');
const couponController = require("../controller/admin/couponController.js");
const walletController = require("../controller/user/walletController.js") 
const auth = require("../middleware/auth");
const multer = require('multer');
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

router.get("/shop", auth.isLoggedIn, userController.loadShop);

router.get("/home", userController.loadHome);

router.get(
  "/singleProduct/:productId",
  auth.isLoggedIn,
  userController.loadSingleProduct
);

router.get("/forgot-password", authController.loadForgotPassword);
router.post("/forgot-password/send-otp", authController.emailVerification);
router.get("/forgot-password/otp", authController.forgotPasswordOtpPage);
router.get("/forgot-password/verify-otp", authController.loadforgototp);
router.post("/forgot-password/verify-otp", authController.verifyForgotOtp);
router.post("/reset-password-success", authController.resetPassword);
router.get("/forgotNewPassword", authController.loadEnterNewPassword);


router.get("/profile", userProfileController.loadprofile);

router.get('/profile/address/add', auth.isLoggedIn, userProfileController.loadAddAddress);
router.post('/profile/address/add', auth.isLoggedIn, userProfileController.saveAddress);
router.post("/profile/address/:id/set-default", auth.isLoggedIn, userProfileController.setDefaultAddress);
router.get('/profile/address/:id/edit', auth.isLoggedIn, userProfileController.loadEditAddress);
router.post('/profile/address/:id/edit', auth.isLoggedIn, userProfileController.editAddressPost);
router.post('/profile/address/:id/delete', auth.isLoggedIn, userProfileController.deleteAddress);

router.get('/profile/change-password', auth.isLoggedIn, userProfileController.loadChangePassword);
router.post('/profile/change-password', auth.isLoggedIn, userProfileController.changePassword);

router.get('/profile/edit', auth.isLoggedIn, editProfileController.loadEditProfilePage);
router.post('/profile/edit', auth.isLoggedIn, profileUpload.single("profileImage"), editProfileController.updateProfile);

router.get("/profile/edit-profile/verify-otp", auth.isLoggedIn, editProfileController.loadEmailOTPPage);
router.post("/profile/edit-profile/verify-otp", auth.isLoggedIn, editProfileController.verifyEmailOTP);



router.get("/wishlist", auth.isLoggedIn,wishlistController.loadWishlist )
router.post('/wishlist/add/:id', auth.isLoggedIn, wishlistController.addToWishlist);
router.post("/wishlist/remove/:id", auth.isLoggedIn, wishlistController.removeFromWishlist);
router.post("/wishlist/add-all-to-cart", wishlistController.addAllToCart);

router.get("/cart", auth.isLoggedIn, cartController.loadCart);
router.post("/cart/add/:id", auth.isLoggedIn, cartController.addToCart);
router.post("/cart/increase/:id", auth.isLoggedIn, cartController.increaseQuantity);
router.post("/cart/decrease/:id", auth.isLoggedIn, cartController.decreaseQuantity);
router.post("/cart/remove/:id", auth.isLoggedIn, cartController.removeFromCart);

router.post('/checkout/select-address', auth.isLoggedIn, userProfileController.selectAddress);
router.get("/checkout", auth.isLoggedIn, checkoutController.loadCheckout);

router.post('/proceedToCheckout', auth.isLoggedIn, checkoutController.placeOrder);
router.get("/order-success", auth.isLoggedIn, checkoutController.loadSuccessPage);

router.get("/my-orders", auth.isLoggedIn, orderController.loadMyOrders);
router.get("/order/:id", auth.isLoggedIn, orderController.loadOrderDetails);

router.post("/order/:orderId/cancel", auth.isLoggedIn, orderController.cancelOrder);
router.post("/order/:orderId/return", auth.isLoggedIn, orderController.returnOrder);
router.post("/order/:orderId/cancel-item/:itemId", auth.isLoggedIn, orderController.cancelOrderItem);
router.post("/order/:orderId/return-item/:itemId", auth.isLoggedIn, orderController.returnOrderItem);


router.get("/order/:orderId/invoice", auth.isLoggedIn, orderController.viewInvoice);
router.get("/order/:orderId/invoice/downlaod", auth.isLoggedIn, orderController.downloadInvoice);
router.get("/logout", userController.userLogout);

router.post("/coupon/validate", auth.isLoggedIn,couponController.validateCoupon);

router.get("/order/:orderId/cancel-preview/:itemId",auth.isLoggedIn ,orderController.cancelPreview);

router.get("/wallet", auth.isLoggedIn, walletController.loadWalletPage);

// router.get('/header-partial', userController.loadHeaderPartial);

module.exports = router;
