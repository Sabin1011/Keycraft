const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");

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

    const totalPages = Math.ceil(totalOrders / limit);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("adminOrderDetails", {
      // activePage: "orders",
      orders,
      statusOptions,
      search,
      currentPage: page,
      totalPages,
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

    console.log(status);
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

    if (!updatedOrder) {
      console.log("Order not found for orderId : ", orderId);
    }

    res.redirect("/admin/orders");
  } catch (error) {
    console.log("Admin status update error:", error);
    res.redirect("/admin/orders");
  }
};

const acceptReturn = async (req, res) => {
  try {
    const { orderId , itemId} = req.params;
    const order = await Order.findOne({ orderId }).populate("items.product");

    if (!order) {
      console.log("Order not found:", orderId);
      return res.redirect("/admin/orders/");
    }

    const item =  order.items.id(itemId);

    if (!item || item.status !== "Return Requested") {
      console.log("Item not in 'Return Requested' state:", itemId);
      return res.redirect(`/admin/orders/${orderId}`);
    }

    const product = await Product.findById(item.product._id);
    if(product && item.variantId) {
      const variant =  product.variants.id(item.variantId);
      if(variant) variant.quantity += item.quantity;
      
      product.totalStock = product.variants.reduce(
        (sum,v)=>sum +v.quantity,
        0
      )
      await product.save();
    }

    item.status = "Returned"; 

    await order.save();

    let wallet = await Wallet.findOne({ userId: order.userId });

    if (!wallet) {
      wallet = new Wallet({
        userId: order.userId,
        balance: 0,
        transactions: [],
      });
    }
    const alreadyRefunded = wallet.transactions.some(
      tx=>
        tx.orderId?.toString() === order._id.toString() &&
        tx.itemId?.toString() === item._id.toString()
    );  

    if(!alreadyRefunded){
      const refundAmount = item.price * item.quantity;

      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: "credit",
        reason: "Refund for returned item",
        orderId: order._id,
        itemId: item._id,
      }); 
      await wallet.save();
    }

    const allReturned = order.items.every(
      i => i.status === "Returned"
    );

    if(allReturned) {
      order.status = "Returned";
      order.orderStatus = "Refunded";
    
    } else{
      order.status = "Partially Returned"
    }
    await order.save(); 

    return res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.log("Accept return error:", error);
    return res.redirect("/admin/orders/");
  }
};

const rejectReturn = async (req, res) => {
  try {
    const { orderId , itemId} = req.params;


    const order =  await Order.findOne({orderId});
    if(!order) return res.redirect("/admin/orders");

    const item = order.items.id(itemId);
    if(!item) return res.redirect(`/admin/orders/${orderId}`);

    item.status = "Delivered";
    await order.save()  

    return res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.log("Reject return error:", error);
    res.redirect("/admin/orders/");
  }
};

const loadSingleOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate("userId", "username email")
      .populate("items.product");

    if (!order) {
      return res.redirect("/admin/orders");
    }

    res.render("singleOrderDetails", {
      order,
    });
  } catch (error) {
    console.log("Load single order error:", error);
    res.redirect("/admin/orders");
  }
};

module.exports = {
  updateOrderStatus,
  loadOrders,
  updateStatus,
  acceptReturn,
  rejectReturn,
  loadSingleOrder,
};
