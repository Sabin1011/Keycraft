const User = require('../../models/userSchema');
const bcrypt = require("bcrypt");

// =======================
// LOAD ADMIN LOGIN PAGE
// =======================
const loadLogin = async (req, res) => {
    try {
        res.render("adminLogin");
    } catch (error) {
        console.log("Error loading login page:", error);
    }
};

// =======================
// ADMIN LOGIN HANDLER
// =======================
const adminlogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ email, isAdmin: true });

        if (!admin) {
            return res.redirect("/admin/login");
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.redirect("/admin/login");
        }

        req.session.admin = admin._id;

        res.redirect("/admin/category");

    } catch (error) {
        console.log("Admin login error:", error);
        res.redirect("/admin/login");
    }
};

module.exports = {
    loadLogin,
    adminlogin
};
