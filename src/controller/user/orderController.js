const Order = require("../../models/orderSchema");

const loadMyOrders = async (req, res) => {
  try {
    const userId = req.session.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.render("myOrders", {
      orders
    });
  } catch (error) {
    console.log("Error loading orders:", error);
    res.redirect("/home");
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate("items.product");

    if (!order) return res.redirect("/my-orders");

    res.render("orderDetails", {
      order
    });
  } catch (error) {
    console.log("Error loading order details:", error);
    res.redirect("/my-orders");
  }
};

module.exports = {
  loadMyOrders,
  loadOrderDetails
};
