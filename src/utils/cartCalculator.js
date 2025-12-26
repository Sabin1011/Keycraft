const Offer = require("../models/offerSchema");

const calculateCartTotals = async (cart) => {
  let invalidItemExists = false;

  const offers = await Offer.find({
    isActive: true,
    startDate: { $lte: new Date() },
    expiryDate: { $gte: new Date() },
  });

  const productCategoryOffers = offers.filter(
    o => o.offerType === "product" || o.offerType === "category"
  );

  const cartOffers = offers.filter(o => o.offerType === "cart");

  for (let item of cart.items) {
    item.isAvailable = true;

    let applicableOffers = [];

    const productOffers = productCategoryOffers.filter(
      o =>
        o.offerType === "product" &&
        o.productIds.some(id => id.toString() === item.product._id.toString())
    );

    applicableOffers.push(...productOffers);

    if (item.product.category) {
      const categoryOffers = productCategoryOffers.filter(
        o =>
          o.offerType === "category" &&
          o.categoryIds.some(id => id.toString() === item.product.category._id.toString())
      );
      applicableOffers.push(...categoryOffers);
    }

    let bestOffer = null;
    let discountAmount = 0;
    let discountedUnitPrice = item.product.price;

    applicableOffers.forEach(offer => {
      let calculated = 0;

      if (offer.discountType === "percentage") {
        calculated = (item.product.price * offer.discountValue) / 100;
        if (offer.maxDiscountAmount && calculated > offer.maxDiscountAmount) {
          calculated = offer.maxDiscountAmount;
        }
      } else {
        calculated = offer.discountValue;
      }

      if (calculated > discountAmount) {
        discountAmount = calculated;
        bestOffer = offer;
      }
    });

    discountedUnitPrice = Math.max(item.product.price - discountAmount, 0);

    item.originalPrice = item.product.price;
    item.discountedPrice = discountedUnitPrice;
    item.discountAmount = discountAmount;
    item.discountPercentage = Math.round(
      (discountAmount / item.product.price) * 100
    );
    item.offerDetails = bestOffer;
  }

  cart.baseTotal = cart.items.reduce(
    (sum, i) => sum + i.originalPrice * i.quantity,
    0
  );

  cart.totalPrice = cart.items.reduce(
    (sum, i) => sum + i.discountedPrice * i.quantity,
    0
  );


  let cartDiscount = 0;
  let cartBestOffer = null;

  cartOffers.forEach(offer => {
    if (cart.totalPrice >= offer.minCartValue) {
      let calculated = 0;

      if (offer.discountType === "percentage") {
        calculated = (cart.totalPrice * offer.discountValue) / 100;
        if (offer.maxDiscountAmount && calculated > offer.maxDiscountAmount) {
          calculated = offer.maxDiscountAmount;
        }
      } else {
        calculated = offer.discountValue;
      }

      if (calculated > cartDiscount) {
        cartDiscount = calculated;
        cartBestOffer = offer;
      }
    }
  });

  cart.cartDiscount = cartDiscount;
  cart.cartOffer = cartBestOffer;
  cart.grandTotal = Math.max(cart.totalPrice - cartDiscount, 0);

  return cart;
};

module.exports = calculateCartTotals;
