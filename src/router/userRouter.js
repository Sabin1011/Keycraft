const express = require("express");
const router = express.Router();
const userController = require("../controller/user/userController");
const authController = require("../controller/user/authController");
const editProfileController = require("../controller/user/editProfileController")
const userProfileController = require("../controller/user/userProfileController")
const wishlistController = require('../controller/user/wishlistController')
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

router.get("/shop", auth.isLogout, userController.loadShop);

router.get("/home", userController.loadHome);

router.get(
  "/singleProduct/:productId",
  auth.isLogout,
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
router.get("/profile/address/add", userProfileController.loadAddAddress);
router.post("/profile/address/add", userProfileController.saveAddress);
router.post("/profile/address/:addressId/set-default", auth.isLogout, userProfileController.setDefaultAddress);
router.get('/profile/change-password', auth.isLogout, userProfileController.loadChangePassword);
router.post('/profile/change-password', auth.isLogout, userProfileController.changePassword);

router.get('/profile/edit', auth.isLogout, editProfileController.loadEditProfilePage);
router.post('/profile/edit', auth.isLogout, profileUpload.single("profileImage"), editProfileController.updateProfile);

router.get("/profile/edit-profile/verify-otp", auth.isLogout, editProfileController.loadEmailOTPPage);
router.post("/profile/edit-profile/verify-otp", auth.isLogout, editProfileController.verifyEmailOTP);


router.get('/profile/address/:id/edit', auth.isLogout, userProfileController.loadEditAddress);
router.post('/profile/address/:id/edit', auth.isLogout, userProfileController.editAddressPost);
router.post('/profile/address/:id/delete', auth.isLogout, userProfileController.deleteAddress);


router.get("/wishlist", auth.isLogout,wishlistController.loadWishlist )
router.post('/wishlist/add/:id', auth.isLogout, wishlistController.addToWishlist);
router.post("/wishlist/remove/:id", auth.isLogout, wishlistController.removeFromWishlist);


router.get("/logout", userController.userLogout);

module.exports = router;
