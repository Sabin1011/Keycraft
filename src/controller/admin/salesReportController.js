const Order = require("../../models/orderSchema");

const loadSalesReport = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date("1970-01-01");

    const endDate = req.query.endDate
      ? new Date(req.query.endDate + "T23:59:59")
      : new Date();

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Delivered"] }
    }).sort({ createdAt: -1 });

    let totalOrders = orders.length;
    let grossSales = 0;
    let offerDiscount = 0;
    let couponDiscount = 0;
    let netRevenue = 0;

    let paymentStats = {
      razorpay: 0,
      wallet: 0,
      cod: 0
    };

    for (const order of orders) {
      grossSales += order.subtotal || 0;
      offerDiscount += order.offerDiscount || 0;
      couponDiscount += order.discountAmount || 0;
      netRevenue += order.finalAmount || 0;

      if (order.paymentMethod) {
        paymentStats[order.paymentMethod]++;
      }
    }

    res.render("salesReport", {
      orders,
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      summary: {  
        totalOrders,
        grossSales,
        offerDiscount,
        couponDiscount,
        netRevenue
      },
      paymentStats
    });

  } catch (error) {
    console.error("Sales Report Error:", error);
    res.redirect("/admin/dashboard");
  }
};

module.exports = {
    loadSalesReport,

}