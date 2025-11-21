const passport = require("passport");

exports.googleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res) => {
  try {
    req.session.userId = req.user._id;
    res.redirect("/home");
  } catch (error) {
    console.error("Google login error:", error);
    res.redirect("/login");
  }
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.render("home", {
        message: "Logout failed. Please try again.",
      });
    }
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });
};
