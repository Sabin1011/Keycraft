const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const getDateRange = (query) => {
  const now = new Date();
  let startDate, endDate;

  switch (query.reportType) {
    case "daily":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date();
      break;

    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date();
      break;

    case "yearly":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date();
      break;

    default:
      startDate = query.startDate
        ? new Date(query.startDate)
        : new Date("1970-01-01");

      endDate = query.endDate
        ? new Date(query.endDate + "T23:59:59")
        : new Date();
  }

  return { startDate, endDate };
};

const loadSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const baseFilter = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Delivered"] },
    };

    const orders = await Order.find(baseFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(baseFilter);

    const totalPages = Math.ceil(totalOrders / limit);

    let grossSales = 0;
    let offerDiscount = 0;
    let couponDiscount = 0;
    let netRevenue = 0;

    let paymentStats = {
      razorpay: 0,
      wallet: 0,
      cod: 0,
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

    const visiblePages = 5;

    let startPage = Math.max(1, page - Math.floor(visiblePages / 2));
    let endPage = startPage + visiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - visiblePages + 1);
    }

    res.render("salesReport", {
      activePage: "sales-report",
      orders,
      currentPage: page,
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      reportType: req.query.reportType || "",
      totalPages,
      startPage,
      endPage,
      summary: {
        totalOrders,
        grossSales,
        offerDiscount,
        couponDiscount,
        netRevenue,
      },
      paymentStats,
    });
  } catch (error) {
    console.error("Sales Report Error:", error);
    res.redirect("/admin/dashboard");
  }
};

const downloadSalesReportPDF = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Delivered"] },
    });

    let grossSales = 0;
    let offerDiscount = 0;
    let couponDiscount = 0;
    let netRevenue = 0;

    orders.forEach((order) => {
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

    doc.fontSize(20).text("Sales Report", { align: "center" });
    doc.moveDown();

    doc
      .fontSize(12)
      .text(`Period: ${startDate.toDateString()} - ${endDate.toDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text("Summary");
    doc.moveDown(0.5);

    doc.fontSize(11);
    doc.text(`Total Orders: ${orders.length}`);
    doc.text(`Gross Sales: ₹${grossSales.toFixed(2)}`);
    doc.text(`Offer Discount: -₹${offerDiscount.toFixed(2)}`);
    doc.text(`Coupon Discount: -₹${couponDiscount.toFixed(2)}`);
    doc.text(`Net Revenue: ₹${netRevenue.toFixed(2)}`);

    doc.moveDown();

    doc.fontSize(12).text("Orders", { underline: true });
    doc.moveDown(0.5);

    orders.forEach((order) => {
      doc.fontSize(10).text(
        `Order: ${order.orderId || order._id}
Date: ${order.createdAt.toDateString()}
Payment: ${order.paymentMethod}
Subtotal: ₹${(order.subtotal || 0).toFixed(2)}
Discount: ₹${((order.offerDiscount || 0) + (order.discountAmount || 0)).toFixed(
          2
        )}
Final: ₹${(order.finalAmount || 0).toFixed(2)}
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

const downloadSalesReportExcel = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Delivered"] },
    }).sort({ createdAt: -1 });

    let grossSales = 0;
    let offerDiscount = 0;
    let couponDiscount = 0;
    let netRevenue = 0;

    orders.forEach((order) => {
      grossSales += order.subtotal || 0;
      offerDiscount += order.offerDiscount || 0;
      couponDiscount += order.discountAmount || 0;
      netRevenue += order.finalAmount || 0;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = "Sales Report";
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.addRow([]);
    worksheet.addRow([
      `Period: ${startDate.toDateString()} = ${endDate.toDateString()}`,
    ]);

    worksheet.addRow([]);

    worksheet.addRow(["Summary"]);
    worksheet.addRow(["Total Orders", orders.length]);
    worksheet.addRow(["Gross Sales", grossSales]);
    worksheet.addRow(["Offer Discount", offerDiscount]);
    worksheet.addRow(["Coupon Discount", couponDiscount]);
    worksheet.addRow(["Net Revenue", netRevenue]);

    worksheet.addRow([]);
    worksheet.addRow([]);

    worksheet.addRow([
      "Order ID",
      "Date",
      "Payment Method",
      "Subtotal",
      "Discount",
      "Final Amount",
      "Status",
    ]);

    const headerRow = worksheet.lastRow;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
    });

    orders.forEach((order) => {
      worksheet.addRow([
        order.orderId || order._id.toString(),
        order.createdAt.toDateString(),
        order.paymentMethod,
        order.subtotal || 0,
        (order.offerDiscount || 0) + (order.discountAmount || 0),
        order.finalAmount || 0,
        order.status,
      ]);
    });

    worksheet.columns.forEach((column) => {
      column.width = 18;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Download Error: ", error);
    res.redirect("/admin/sales-report");
  }
};

module.exports = {
  loadSalesReport,
  downloadSalesReportPDF,
  downloadSalesReportExcel,
};
