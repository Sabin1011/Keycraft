const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");

const loadLogin = async (req, res) => {
  try {

    res.render("adminLogin", {
      errors: {},
      email: "",
      password: "",
    });
  } catch (error) {
    console.log("Error loading login page:", error);
  }
};


const adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const errors = {};

    if (!email || email.trim() === "") {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password || password.trim() === "") {
      errors.password = "Password is required";
    }
    if (password.length < 4) {
      errors.password = "password must contain atleast 4 characters";
    }

    if (Object.keys(errors).length > 0) {
      return res.render("adminLogin", {
        errors,
        email,
        password,
      });
    }

    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.redirect("/admin/login");
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.render("adminLogin",{
        errors: {email:"Admin not found"},
        email,
        password: "",
      });
    }

    req.session.admin = admin._id;

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.log("Admin login error:", error);
    res.redirect("/admin/login");
  }
};

const logout = async (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
};

module.exports = {
  loadLogin,
  adminlogin,
  logout,
};
