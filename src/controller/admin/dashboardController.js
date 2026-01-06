const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

const loadDashboard = async (req, res) => {
  try {

    const salesData = await Order.aggregate([
      {
        $match: {
          status: { $in: ["Placed", "Confirmed", "Delivered"] }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalSales: { $sum: "$finalAmount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const salesChartData = {
      labels: salesData.map(d =>
        ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d._id - 1]
      ),
      values: salesData.map(d => d.totalSales)
    };

    const bestProductsAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    const productIds = bestProductsAgg.map(p => p._id);
    const products = await Product.find({ _id: { $in: productIds } });

    const bestProducts = bestProductsAgg.map(p => {
      const product = products.find(pr => pr._id.toString() === p._id.toString());
      return {
        name: product?.name || "Unknown Product",
        totalSold: p.totalSold
      };
    });

    const bestCategories = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category.name",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);


    const bestBrands = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.brand",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    res.render("dashboard", {
      // activePage: "dashboard",
      salesChartData,
      bestProducts,
      bestCategories,
      bestBrands
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.redirect("/admin");
  }
};

const getSalesChartDate = async(req, res)=>{
  try {
    const filter = req.query.filter;
    let groupStage = {};
    let sortStage = {};

    if(filter === "daily"){
      groupStage = {
        _id:{
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        totalSales: {$sum:"$finalAmount"}
        
      };
      sortStage = { "_id.day":1 };
    } else if(filter === "month") {
      groupStage = {
        _id: {$month: "$createdAt"},
        totalSales: { $sum: "$finalAmount" }
      };
      sortStage = {"_id":1}
    } else if(filter === "year") {
      groupStage={
        _id:{$year: "$createdAt"},
        totalSales:{$sum:"$finalAmount"}
      };
      sortStage={"_id":1}
    };

    const salesData = await Order.aggregate([
      {$match: {status:{$in: ["Placed","Confirmed","Delivered"]}}},
      {$group: groupStage},
      {$sort: sortStage}
    ]);

    let labels = [];
    let values = [];


    if(filter === "daily") {
      labels = salesData.map(d=>`Day ${d._id.day}`);
      values = salesData.map(d=>d.totalSales);
    }

    if(filter === "month") {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      labels = salesData.map(d=>months[d._id - 1]);
      values = salesData.map(d => d.totalSales);
    }

    if (filter === "year") {
      labels = salesData.map(d => d._id);
      values = salesData.map(d => d.totalSales);
    }

    res.json({labels,values});


  } catch (error) {
    console.error("Sales chart error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
}

module.exports = {
  loadDashboard,
  getSalesChartDate
};
