const Coupon = require("../../models/couponSchema");
const Orders = require("../../models/orderSchema");

const loadCouponList = async (req, res) => {
  try {
    const search = req.query.search || "";
    const currentPage = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (currentPage - 1) * limit;

    const query = {
      code: { $regex: search, $options: "i" },
    };

    const totalCoupons = await Coupon.countDocuments(query);

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.render("couponManage", {
      activePage: "coupons",
      coupons,
      currentPage,
      limit,
      totalCoupons,
      search,
    });
  } catch (err) {
    console.log("Coupon List Error:", err);
    res.status(500).send("Server Error");
  }
};

const loadAddCoupon = async (req, res) => {
  try {
    res.render("addCoupon",{
      activePage: "coupons",
    });
  } catch (error) {}
};

const addCoupon = async (req, res) => {
  try {
    let {
      code,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount,
      expiryDate,
      description,
    } = req.body;

        const errors = {};

    code = code.toUpperCase();
    discountValue = Number(discountValue);
    maxDiscountAmount = maxDiscountAmount ? Number(maxDiscountAmount) : null;
    minPurchaseAmount = minPurchaseAmount ? Number(minPurchaseAmount) : null;

    if (!code) errors.code = "Coupon code is required";
    if (!discountType) errors.discountType = "Select a discount type";
    if (!discountValue) errors.discountValue = "Enter a discount value";
    if (!expiryDate) errors.expiryDate = "Please select an expiry date";

    if (Object.keys(errors).length > 0)
      return res.json({ success: false, errors });


    if (!/^[A-Z0-9]{3,15}$/.test(code)) {
        errors.code = "Code must be 3–15 characters (A-Z, 0-9 only)";
    }

    const exists = await Coupon.findOne({ code });
    if (exists) {
        errors.code = "Coupon code already exists";
    }

    if (!["percentage", "flat"].includes(discountType)) {
     errors.discountType = "Invalid discount type";
    }

    if (discountValue <= 0) {
      errors.discountValue = "Discount must be greater than 0";
    }

    if (discountType === "percentage" && discountValue > 90) {
        errors.discountValue = "Percentage cannot exceed 90%";
    }

    if (
      discountType === "percentage" &&
      (!maxDiscountAmount || maxDiscountAmount <= 0)
    ) {
      errors.maxDiscountAmount = "Max discount is required for percentage coupons";
    }

    if (minPurchaseAmount && minPurchaseAmount < 0) {
      errors.minPurchaseAmount = "Cannot be negative";
    }

    const now = new Date();
    const expiry = new Date(expiryDate);

    if (expiry <= now) {
        errors.expiryDate = "Expiry date must be in the future";
    }

        if (Object.keys(errors).length > 0)
      return res.json({ success: false, errors });

    const coupon = new Coupon({
      code,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount,
      expiryDate,
      description,
    });

    await coupon.save();

    return res.json({ success: true, message: "Coupon added successfully" });
  } catch (err) {
    return res.json({ success: false, errors: { general: "Server error" } });
  }
};

const loadEditCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.redirect("/admin/couponManage");
    }

    res.render("editCoupon", { 
      coupon,
      activePage: "coupons",
   });
  } catch (error) {
    console.log("Edit coupon load error:", error);
    res.redirect("/admin/couponManage");
  }
};

const editCoupon = async (req, res) => {
  try {
    const {
      couponId,
      code,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount,
      expiryDate,
      description
    } = req.body;

    let errors = {};

    const discount = Number(discountValue);
    const max = maxDiscountAmount === "" ? null : Number(maxDiscountAmount);
    const min = minPurchaseAmount === "" ? null : Number(minPurchaseAmount);

    if (!code) errors.code = "Coupon code is required";
    if (!discountValue) errors.discountValue = "Discount value is required";
    if (!expiryDate) errors.expiryDate = "Expiry date is required";

    if (code && !/^[A-Z0-9]{3,15}$/i.test(code))
      errors.code = "Code must be 3–15 characters and alphanumeric";

    if (Object.keys(errors).length > 0)
      return res.json({ success: false, errors });

    const exists = await Coupon.findOne({
      code: code.toUpperCase(),
      _id: { $ne: couponId },
    });

    if (exists)
      return res.json({
        success: false,
        errors: { code: "Coupon code already exists" }
      });

    if (new Date(expiryDate) <= new Date())
      errors.expiryDate = "Expiry date must be in the future";

    if (discountType === "percentage") {
      if (discount > 90)
        errors.discountValue = "Percentage discount cannot exceed 90%";

      if (!max || max <= 0)
        errors.maxDiscountAmount = "Max discount is required for percentage coupons";
    }

    if (min !== null && min < 0)
      errors.minPurchaseAmount = "Minimum purchase cannot be negative";

    if (Object.keys(errors).length > 0)
      return res.json({ success: false, errors });

    // Save updated values
    await Coupon.findByIdAndUpdate(couponId, {
      code: code.toUpperCase(),
      discountType,
      discountValue: discount,
      maxDiscountAmount: max,
      minPurchaseAmount: min,
      expiryDate,
      description,
    });

    return res.json({ success: true, message: "Coupon updated successfully" });

  } catch (err) {
    console.log(err);
    return res.json({
      success: false,
      errors: { general: "Failed to update coupon" }
    });
  }
};


const toggleCouponStatus = async (req, res) => {
  try {
    const id = req.params.id;

    const coupon = await Coupon.findById(id);
    if (!coupon)
      return res.json({ success: false, message: "Coupon not found" });

    coupon.isDeleted = !coupon.isDeleted;
    await coupon.save();

    return res.json({
      success: true,
      message: coupon.isDeleted ? "Coupon deleted" : "Coupon restored",
    });
  } catch (err) {
    console.log("Toggle Error:", err);
    return res.json({ success: false, message: "Error updating coupon" });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { couponCode, cartTotal } = req.body;

    const userId = req.session.userId;
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isDeleted: false
    });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon" });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return res.json({ success: false, message: "Coupon has expired" });
    }

    if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
      return res.json({
        success: false,
        message: `Minimum purchase amount is ₹${coupon.minPurchaseAmount}`
      });
    }

    const alreadyUsed = await Orders.findOne({
      userId,
      couponId: coupon._id
    });
    if(alreadyUsed){
      return res.json({
        success:false,
        message:"You have  already used this coupon"
      })
    }
    if(coupon.usedCount >= coupon.totalUsageLimit){
      return res.json({
        success:false,
        message: "coupon usage limit reached"
      })
    }
    let discountAmount = 0;
    
    if (coupon.discountType === "percentage") {
      discountAmount = (cartTotal * coupon.discountValue) / 100;

      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = cartTotal - discountAmount;

    return res.json({
      success: true,
      discountAmount,
      finalAmount
    });

  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Server error" });
  }
};


module.exports = {
  loadCouponList,
  loadAddCoupon,
  addCoupon,
  loadEditCoupon,
  editCoupon,
  toggleCouponStatus,
  validateCoupon
};
