const User = require("../../models/userSchema.js")
const Cart = require("../../models/cartModel.js")

// Imports the User model to fetch user details from MongoDB.

const loadAbout = async (req, res) => {
  try {
    let cartCount = 0;
    
    const userId = req.session.userId;

        if (userId) {
          const cart = await Cart.findOne({ userId });
          if (cart && cart.items) {
            cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
          }
        }
    const user = await User.findById(userId);
    return res.render("about",{
      cartCount,
      user
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  loadAbout,
};
