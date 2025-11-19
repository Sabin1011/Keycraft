const User = require("../models/userSchema");



// Middleware for protecting user routes



const isLogged = async (req, res, next) => {
    try {
      if (req.session && req.session.userId) {
        return res.redirect("/home");
      }
      next();
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

const ifLoggedAdmin = (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      return next();  // return is required
    }

    return res.redirect("/admin/login");

  } catch (error) {
    console.error(error);
    return res.redirect("/admin/login");
  }
};

// If admin is already logged in, prevent opening login page
const adminLogoutCheck = (req, res, next) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/category"); // redirect to admin home
    }
    next(); // proceed to login page
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = adminLogoutCheck;




  const isLogout = async(req,res,next)=>{
    try {
      if(req.session.userId){
        const userId = req.session.userId;
        const user = await User.findOne({_id: userId, status:true})

        if(!user){
          req.session.destroy((err) => {
            if (err) {
              console.error("Error destroying session:", err);
              return res.status(500).send("Error logging out");
            };
          });
           return res.redirect("/login")
        };

            
        return next()
      }else{
        res.redirect("/login")
      }
    } catch (error) {
      console.log(error)
    }
  }

// Middleware for protecting admin routes

const adminAuth = (req, res, next)=>{
    if(req.session && req.session.admin) {
        next();
    } else {
        res.redirect("/admin/login");
    }
};

// middlewares/auth.js
isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    // Prevent caching protected pages
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }
  
  res.redirect("/login"); // If not logged in, redirect to login
};


module.exports = { adminAuth, isAuthenticated,isLogged,isLogout,ifLoggedAdmin,adminLogoutCheck }