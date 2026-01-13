const Offer = require("../../models/offerSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

const loadOfferManage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const query = search
      ? { title: { $regex: search, $options: "i" } }
      : {};

    const totalOffers = await Offer.countDocuments(query);

    const offers = await Offer.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const allProducts = await Product.find({}).lean();
    const allCategories = await Category.find({}).lean();

    return res.render("offerManage", {
      activePage: "offers",
      offers,
      allProducts,
      allCategories,
      currentPage: page,
      totalOffers,
      limit,
      search
    });

  } catch (err) {
    console.log("Error loading offer page:", err);
    return res.redirect("/admin");
  }
};

const loadAddOfferPage = async (req, res) => {
  const allProducts = await Product.find();
  const allCategories = await Category.find();

  res.render("addOffer", {
    activePage: "offers",
    allProducts,
    allCategories,
  selectedProducts: [],
  selectedCategories: []
  });
};

const addOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      offerType,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount,
      startDate,
      expiryDate,
      productIds,
      categoryIds
    } = req.body;

    const newOffer = new Offer({
      title,
      description,
      offerType,
      discountType,
      discountValue,
      maxDiscountAmount: maxDiscountAmount || null,
      minPurchaseAmount: minPurchaseAmount || 0,
      startDate,
      expiryDate,

      productIds: offerType === "product"
        ? Array.isArray(productIds) ? productIds : [productIds]
        : [],

      categoryIds: offerType === "category"
        ? Array.isArray(categoryIds) ? categoryIds : [categoryIds]
        : []
    });

    await newOffer.save();

    return res.redirect("/admin/offerManage");

  } catch (error) {
    console.log("Add Offer Error:", error);
    return res.redirect("/admin/offerManage");
  }
};  

const loadEditOffer = async (req, res) => {
  try {
    const offerId = req.params.id;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.redirect("/admin/offerManage");
    }

    const allProducts = await Product.find();
    const allCategories = await Category.find();

    res.render("editOffer", {
      activePage: "offers",
      offer,
      allProducts,
      allCategories,

      selectedProducts: offer.offerType === "product"
        ? offer.productIds.map(id => id.toString())
        : [],

      selectedCategories: offer.offerType === "category"
        ? offer.categoryIds.map(id => id.toString())
        : []
    });
  } catch (error) {
    console.error("Load Edit Offer Error:", error);
    res.redirect("/offerManage");
  }
};

const   updateOffer = async (req, res) => {
  try {
    const offerId = req.params.offerId;
    const {
      title,
      description,
      offerType,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount,
      startDate,
      expiryDate,
      productIds,
      categoryIds
    } = req.body;

    const updateData = {
      title,
      description,
      offerType,
      discountType,
      discountValue,
      maxDiscountAmount: maxDiscountAmount || null,
      startDate,
      expiryDate
    };

    updateData.productIds = [];
    updateData.categoryIds = [];
    updateData.minPurchaseAmount = 0;

    if (offerType === "product") {
      updateData.productIds = Array.isArray(productIds)
        ? productIds
        : productIds ? [productIds] : [];
    }

    if (offerType === "category") {
      updateData.categoryIds = Array.isArray(categoryIds)
        ? categoryIds
        : categoryIds ? [categoryIds] : [];
    }

    if (offerType === "cart") {
      updateData.minPurchaseAmount = minPurchaseAmount || 0;
    }

    await Offer.findByIdAndUpdate(
      offerId,
      updateData,
      { runValidators:true}
    );

    res.json({success:true});

  } catch (error) {
    console.error("Update Offer Error:", error);
    res.status(500).json({ success: false });
  }
};

const toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    return res.json({
      success: true,
      isActive: offer.isActive
    });

  } catch (error) {
    console.error("Toggle Offer Error:", error);
    return res.status(500).json({ success: false });
  }
};


module.exports = {
    loadOfferManage,
    loadAddOfferPage,
    addOffer,
    loadEditOffer,
    updateOffer,
    toggleOfferStatus
}