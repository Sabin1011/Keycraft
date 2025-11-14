const express = require('express')
const router = express.Router()
const userController = require('../controller/user/userController');
const authController = require('../controller/user/authController')
const auth=require("../middleware/auth")

// Register Routes
router.get("/register",authController.loadRegister);
router.post("/register", authController.register);

router.get("/otp", authController.loadOtp);
router.post("/verify-otp", authController.verifyOtp);

router.get("/login", auth.ifLogged, authController.loadLogin);
router.post("/login", authController.login);

router.get("/shop",userController.loadShop);


router.get("/home", userController.loadHome);

router.get("/singleProduct/:productId",userController.loadSingleProduct)



router.get("/productDetails",userController.loadProductDetails);

router.get("/forgotPassword",authController.loadForgotPassword)

router.get("/forgotNewPassword",authController.loadEnterNewPassword)

router.get("/logout", (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out");
    }

    // Clear session cookie
    res.clearCookie("connect.sid", {
      path: "/", 
      httpOnly: true,
      secure: false, // change to true if using HTTPS
      sameSite: "lax"
    });

    // Prevent browser from caching pages
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Redirect to login
    return res.redirect("/login");
  });
});


module.exports = router;