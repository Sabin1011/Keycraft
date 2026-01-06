const User = require("../models/userSchema");

const isLogged = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      return res.redirect("/");
    }
    next();
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const adminLogoutCheck = (req, res, next) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/category");
    }
    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const isLoggedIn = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const userId = req.session.userId;
      const user = await User.findOne({ _id: userId, status: true });

      if (!user) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("Error logging out");
          }
        });
        return res.redirect("/login");
      }

      req.user = user;

      return next();
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error);
  }
};

// adminAuth

const adminAuth = (req, res, next) => {
  if(!req.session.admin){
    return res.redirect("/admin/login");
  }
  next();
};

module.exports = { adminAuth, isLogged, isLoggedIn, adminLogoutCheck };
