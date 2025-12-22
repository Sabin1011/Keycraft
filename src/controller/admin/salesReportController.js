const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit")

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

const downloadSalesReportPDF = async (req, res) => {
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
    });

    let grossSales = 0;
    let offerDiscount = 0;
    let couponDiscount = 0;
    let netRevenue = 0;

    orders.forEach(order => {
      grossSales += order.subtotal || 0;
      offerDiscount += order.offerDiscount || 0;
      couponDiscount += order.discountAmount || 0;
      netRevenue += order.finalAmount || 0;
    });

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.pdf"
    );

    doc.pipe(res);

    // Title
    doc.fontSize(20).text("Sales Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Period: ${startDate.toDateString()} - ${endDate.toDateString()}`);
    doc.moveDown();

    // Summary
    doc.fontSize(14).text("Summary");
    doc.moveDown(0.5);

    doc.fontSize(11);
    doc.text(`Total Orders: ${orders.length}`);
    doc.text(`Gross Sales: ₹${grossSales.toFixed(2)}`);
    doc.text(`Offer Discount: -₹${offerDiscount.toFixed(2)}`);
    doc.text(`Coupon Discount: -₹${couponDiscount.toFixed(2)}`);
    doc.text(`Net Revenue: ₹${netRevenue.toFixed(2)}`);

    doc.moveDown();

    // Table Header
    doc.fontSize(12).text("Orders", { underline: true });
    doc.moveDown(0.5);

    orders.forEach(order => {
      doc.fontSize(10).text(
        `Order: ${order.orderId || order._id}
Date: ${order.createdAt.toDateString()}
Payment: ${order.paymentMethod}
Subtotal: ₹${(order.subtotal || 0).toFixed(2)}
Discount: ₹${((order.offerDiscount || 0) + (order.discountAmount || 0)).toFixed(2)}
Final: ₹${(order.finalAmount||0).toFixed(2)}
Status: ${order.status}
-----------------------------`
      );
    });

    doc.end();
  } catch (err) {
    console.error("PDF Download Error:", err);
    res.redirect("/admin/sales-report");
  }
};

module.exports = {
    loadSalesReport,
    downloadSalesReportPDF
}