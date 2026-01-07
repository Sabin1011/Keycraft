const express = require("express");
const router = express.Router();
const passport = require("passport");
const authController = require("../controller/user/googleAuthController");

router.get("/google", authController.googleLogin);

router.get(
  "/google/callback",
  
  passport.authenticate("google", { failureRedirect: "/login" }),
  authController.googleCallback
);

router.get("/logout", authController.logout);

module.exports = router;
