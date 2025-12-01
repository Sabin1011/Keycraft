const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");

const loadOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId")
      .sort({ createdAt: -1 });

    res.render("adminOrderDetails", { orders });
  } catch (error) {
    console.log("Error loading orders:", error);
    res.redirect("/admin/dashboard");
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    await Order.findByIdAndUpdate(orderId, { status });

    console.log(status)
    res.redirect("/admin/orders");
  } catch (error) {
    console.log("Error updating order status:", error);
    res.redirect("/admin/orders");
  }
};


module.exports = {
    loadOrders,
    updateStatus,


}