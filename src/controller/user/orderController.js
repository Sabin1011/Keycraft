const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Cart = require('../../models/cartModel');
const Product = require("../../models/productSchema");
const PDFDocument = require("pdfkit");

const loadMyOrders = async (req, res) => {
  try {

    const userId = req.session.userId;

    const user = await User.findById(userId);
    const search =  req.query.search || "";

    let query = {userId}

    if(search.trim() !== ""){
      query.orderId = {$regex: search, $options: "i" }
    }

  
    const orders = await Order.find({ userId })
    .populate("couponId")
    .sort({ createdAt: -1 });


    res.render("myOrders", {
      orders,
      user,
      search,

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
      cartCount,
        currentUrl: req.originalUrl  
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
    const { reason,redirectTo } = req.body;

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

    res.redirect(redirectTo? redirectTo.trim() : "/my-orders");
  } catch (error) {
    console.log("Error processing return request:", error);
    res.redirect("/my-orders");
  }
};
const viewInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.session.userId;



    const order = await Order.findOne({ orderId })
      .populate("items.product")
      .populate("userId")

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("invoice", { order,user });

  } catch (error) {
    console.log("Invoice view error:", error);
    res.status(500).send("Server error");
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId }).populate("items.product");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${orderId}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(20).text("INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Order ID: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.createdAt).toDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text("Customer Details", { underline: true });
    doc.fontSize(12).text(`Name: ${order.userName}`);
    doc.text(`Email: ${order.userEmail}`);
    doc.moveDown();

    doc.fontSize(14).text("Shipping Address", { underline: true });
    doc.fontSize(12).text(
      `${order.address.street}, ${order.address.city}, ${order.address.state} - ${order.address.zipCode}, ${order.address.country}`
    );
    doc.moveDown();

    doc.fontSize(14).text("Order Items", { underline: true });
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold");
    doc.text("Item", 50, doc.y);
    doc.text("Price", 250, doc.y);
    doc.text("Qty", 350, doc.y);
    doc.text("Total", 430, doc.y);
    doc.moveDown();

    doc.font("Helvetica");

    order.items.forEach((item) => {
      doc.text(item.product.name, 50, doc.y);
      doc.text(`₹${item.price.toFixed(2)}`, 250, doc.y);
      doc.text(item.quantity, 350, doc.y);
      doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 430, doc.y);
      doc.moveDown();
    });

    doc.moveDown();
    doc.fontSize(14).text("Summary", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Subtotal: ₹${order.subtotal}`);
    doc.text(`Shipping: ₹${order.shippingFee}`);
    doc.text(`Tax: ₹${order.tax}`);

    if (order.discount) {
      doc.text(`Discount: -₹${order.discount}`);
    }

    doc.moveDown();
    doc.fontSize(16).text(`Total Paid: ₹${order.totalAmount}`, {
      bold: true,
    });

    doc.end(); 
  } catch (err) {
    console.log("Invoice error:", err);
    return res.status(500).send("Could not generate invoice");
  }
};

const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { redirectTo } = req.body;

    const order = await Order.findOne({ orderId }).populate("couponId");

    if (!order) return res.redirect(redirectTo);

    const item = order.items.id(itemId);
    if (!item) return res.redirect(redirectTo);

    const product = await Product.findById(item.product);
    if (product) {
      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (variant) variant.quantity += item.quantity;
      }
      product.totalStock = product.variants.reduce((sum, v) => sum + v.quantity, 0);
      await product.save();
    }

    order.items.pull(itemId);
    await order.save()
    
    if (order.items.length === 0) {
      order.status = "Cancelled";
       order.totalAmount = 0;
      order.discountAmount = 0;
      order.finalAmount = 0;
      order.couponId = null;
      await order.save();
      return res.redirect(redirectTo);
    }

    const newTotal = order.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    order.totalAmount = newTotal;

    if(order.couponId) {
      const coupon = order.couponId;

      let discount = 0;

      if(newTotal < coupon.minPurchaseAmount) {
        order.couponId = null;
        order.discountAmount =0;
        order.finalAmount = newTotal;
      } else {
          if (coupon.discountType === "percentage") {
    discount = (newTotal * coupon.discountValue) / 100;

    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
    }
} else{
            discount = coupon.discountValue;
          }
          order.discountAmount = discount;
        order.finalAmount = newTotal - discount;
      }
    }else{
      order.discountAmount = 0;
      order.finalAmount = newTotal;
    }

    await order.save();

    return res.redirect(redirectTo);

  } catch (err) {
    console.log("Cancel item error:", err);
    res.redirect("back");
  }
};

const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { redirectTo } = req.body;

    const order = await Order.findOne({ orderId }).populate("couponId");

    if (!order) return res.redirect(redirectTo);

    const item = order.items.id(itemId);
    if (!item) return res.redirect(redirectTo);

    item.status = "Return Requested";

    const allReturned = order.items.every(i => i.status === "Return Requested");
    if (allReturned) order.status = "Return Requested";

    await order.save();

    return res.redirect(redirectTo);

  } catch (err) {
    console.log("Return item error:", err);
    res.redirect("back");
  }
};

const cancelPreview = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findOne({ orderId }).populate("couponId");
    if (!order) return res.json({ success: false });

    const item = order.items.id(itemId);
    if (!item) return res.json({ success: false });

    const newTotal = order.items.reduce((sum, i) => {
      if (i._id.toString() === itemId) return sum; 
      return sum + i.price * i.quantity;
    }, 0);

    if (!order.couponId) {
      return res.json({
        success: true,
        couponWillBreak: false,
        newTotal
      });
    }

    const coupon = order.couponId;
    const minRequired = coupon.minPurchaseAmount || 0;

    const couponWillBreak = newTotal < minRequired;

    return res.json({
      success: true,
      couponWillBreak,
      newTotal,
      minRequired
    });

  } catch (err) {
    console.log("Preview error:", err);
    res.json({ success: false });
  }
};

module.exports = {
  loadMyOrders,
  loadOrderDetails,
  cancelOrder,
  returnOrder,
  viewInvoice,
  downloadInvoice,
  returnOrderItem,
  cancelOrderItem,
  cancelPreview
  
};
