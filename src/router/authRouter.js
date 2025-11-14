const express = require("express");
const passport = require("passport");
const router = express.Router();

// Start Google Login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback after Google login
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login"}),(req, res)=>{
      req.session.userId = req.user._id;
      res.redirect("/home")
    }
);

// Logout
router.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) {
      console.error("Logout error:", err);
      // If there’s a problem, render your home page
      return res.render("home", { message: "Logout failed. Please try again." });
    }

    // Destroy session and redirect to login
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });
});



module.exports = router;
