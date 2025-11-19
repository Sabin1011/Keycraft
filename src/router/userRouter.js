const express = require('express')
const router = express.Router()
const userController = require('../controller/user/userController');
const authController = require('../controller/user/authController')
const auth=require("../middleware/auth")

// Register Routes
router.get("/register",authController.loadRegister);
router.post("/register", authController.register);

router.get("/otp", authController.loadOtp);
router.get("/verify-otp", authController.verifyOtp);
router.post("/verify-otp", authController.verifyOtp);
router.get("/resend-otp", authController.resendOtp);

router.get("/login", auth.isLogged, authController.loadLogin);
router.post("/login", authController.login);

router.get("/shop",auth.isLogout, userController.loadShop);

router.get("/home", userController.loadHome);

router.get("/singleProduct/:productId",auth.isLogout,userController.loadSingleProduct)

router.get("/forgotPassword",auth.isLogout,authController.loadForgotPassword)

router.get("/forgotNewPassword",auth.isLogout,authController.loadEnterNewPassword)

router.get("/logout", userController.userLogout)


module.exports = router;