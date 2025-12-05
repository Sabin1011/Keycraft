const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Cart = require('../../models/cartModel');
const Product = require("../../models/productSchema")

const loadMyOrders = async (req, res) => {
  try {

    const userId = req.session.userId;

    const user = await User.findById(userId);
    const search =  req.query.search || "";

    let query = {userId}

    if(search.trim() !== ""){
      query.orderId = {$regex: search, $options: "i" }
    }

  
    const orders = await Order.find(query).sort({createdAt: -1  });

    res.render("myOrders", {
      orders,
      user,
      search
    });
  } catch (error) {
    console.log("Error loading orders:", error);
    res.redirect("/home");
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

          let cartCount = 0;  
          if(userId){
            const cart = await Cart.findOne({userId})
            cartCount = cart.items.reduce((sum, item)=>sum + item.quantity, 0)
          }
    const orderId = req.params.id;
    const order = await Order.findOne({orderId}).populate({
      path:"items.product", 
    })

    if (!order) return res.redirect("/my-orders");

    res.render("orderDetails", {
      order,
      user,
      cartCount
    });
  } catch (error) {
    console.log("Error loading order details:", error);
    res.redirect("/my-orders");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const reason = req.body.reason || "";

    const order = await Order.findOne({ orderId }).populate("items.product");

    if (!order) {
      return res.redirect("/my-orders?error=Order not found");
    }

    if (order.status === "Cancelled") {
      return res.redirect("/my-orders?error=Order already cancelled");
    }

    for (const item of order.items) {

      const product = await Product.findById(item.product._id);

      if (!product) continue;

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);

        if (variant) {
          variant.quantity += item.quantity; 
        }
      }

      product.totalStock = product.variants.reduce((sum, v) => sum + v.quantity, 0);

      await product.save();
    }

    order.status = "Cancelled";
    order.cancelReason = reason;
    await order.save();

    return res.redirect("/my-orders?success=Order cancelled successfully");

  } catch (error) {
    console.log("Error cancelling order:", error);
    return res.redirect("/my-orders?error=Something went wrong");
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    console.log("Return request received for:", orderId);
    console.log("Reason:", reason);

    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      {
        status: "Return Requested",
        cancelReason: reason    
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      console.log("Order NOT found for return:", orderId);
      return res.redirect("/my-orders");
    }

    console.log("Updated order:", updatedOrder);

    res.redirect("/my-orders");
  } catch (error) {
    console.log("Error processing return request:", error);
    res.redirect("/my-orders");
  }
};

module.exports = {
  loadMyOrders,
  loadOrderDetails,
  cancelOrder,
  returnOrder
};
