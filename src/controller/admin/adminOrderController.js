const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");

const loadOrders = async (req, res) => {
  try {
    const userId = req.session.userId;
    const statusOptions = Order.schema.path("status").enumValues;
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    let query = {};

    if (search.trim() !== "") {
      query.orderId = { $regex: search, $options: "i" };
    }
    
    const totalOrders = await Order.countDocuments(query);

    const totalPages = Math.ceil(totalOrders/limit)
    const orders = await Order.find(query).sort({ createdAt: -1 }).skip((page - 1)*limit ).limit(limit  );

    res.render("adminOrderDetails", { 
      orders,
      statusOptions,
      search,
      currentPage: page,
      totalPages
    });

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

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      { status },
      { new: true }
    );

    if(!updatedOrder){
      console.log("Order not found for orderId : ", orderId)
    }

    res.redirect("/admin/orders");
  } catch (error) {
    console.log("Admin status update error:", error);
    res.redirect("/admin/orders");
  }
};

const acceptReturn = async (req, res) => {
  try {
    
    const { orderId } = req.params;

    await Order.findOneAndUpdate(
      { orderId },
      { status: "Returned" },
      { new: true }
    );
    return res.redirect("/admin/orders/"); 
  } catch (error) {
    console.log("Accept return error:", error);
    return res.redirect("/admin/orders/");
  }
};

const rejectReturn = async (req, res) => {
  try {
    const { orderId } = req.params;

    await Order.findOneAndUpdate(
      { orderId },
      { status: "Delivered" },
      { new: true }
    );

    return res.redirect("/admin/orders/");
  } catch (error) {
    console.log("Reject return error:", error);
    res.redirect("/admin/orders/");
  }
};


module.exports = {
    updateOrderStatus,
    loadOrders,
    updateStatus,
    acceptReturn,
    rejectReturn


}