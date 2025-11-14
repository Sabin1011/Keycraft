
// Middleware for protecting user routes

const userAuth = (req, res, next)=>{
    if(req.session && req.session.user) {
        next();
    } else {
        res.redirect("/login")
    }
};

const ifLogged = async (req, res, next) => {
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


  const ifLogout = async(req,res,next)=>{
    try {
      if(req.session.userId){
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


module.exports = {userAuth, adminAuth, isAuthenticated,ifLogged,ifLogout }