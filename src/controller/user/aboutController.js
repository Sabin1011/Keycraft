const User = require("../../models/userSchema.js")


// Imports the User model to fetch user details from MongoDB.


const loadAbout = async (req, res) => {
  try {
    const userId = req.session.userId;

    const user = await User.findById(userId);
    return res.render("about",{
      user
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  loadAbout,
};
