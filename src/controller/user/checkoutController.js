const express = require("express");
const Cart = require("../../models/cartModel");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const Offer = require("../../models/offerSchema")

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId);
    if (!user) return res.redirect("/login");

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.product",
      populate: { path: "category" }
    });

    if (!cart || cart.items.length === 0) {
      req.session.errorMessage = "Your cart is empty";
      return res.redirect("/cart");
    }

    let cartTotal = 0;
    let hasStockIssue = false;

    const cartItems = cart.items.map(item => {
    const product = item.product;
    const variant = item.variantId ? product.variants.id(item.variantId) : null;

    const discountedPrice =typeof item.discountedPrice === "number"
      ? item.discountedPrice
      : product.price;

    const originalPrice =
      typeof item.originalPrice === "number"? item.originalPrice : product.price;

    const itemTotal = discountedPrice * item.quantity;

  return {
    product,
    quantity: item.quantity,
    selectedVariant: variant,

    originalPrice,
    discountedPrice,
    itemTotal,

    offerDetails: item.offerDetails || null,
  };

});

const originalSubtotal = cartItems.reduce(
  (sum, item) => sum + item.originalPrice * item.quantity,
  0
);

const itemOfferDiscount = cartItems.reduce(
  (sum, item) =>
    sum + (item.originalPrice - item.discountedPrice) * item.quantity,
  0
);

const cartOfferDiscount = cart.cartDiscount || 0;

const totalOfferDiscount = itemOfferDiscount + cartOfferDiscount;


    const defaultAddress =
      user.addresses?.find(a => a.isDefault) || null;

    const selectedAddressId =
      req.session.selectedAddressId ||
      (defaultAddress ? defaultAddress._id.toString() : null);


      // ALWAYS re-check cart offers at checkout
const offers = await Offer.find({
  isActive: true,
  startDate: { $lte: new Date() },
  expiryDate: { $gte: new Date() }
});

const cartOffers = offers.filter(o => o.offerType === "cart");

let cartDiscount = 0;
let cartBestOffer = null;

cartOffers.forEach(offer => {
  if (cart.totalPrice >= offer.minPurchaseAmount) {
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

await cart.save();

  const appliedOffers = [];

cartItems.forEach(item => {
  if (item.offerDetails) {
    appliedOffers.push({
      level: "item",
      title: item.offerDetails.title,
      type: item.offerDetails.discountType,
      value: item.offerDetails.discountValue,
      productName: item.product.name,
      amount: (item.originalPrice - item.discountedPrice) * item.quantity
    });
  }
});

if (cart.cartOffer && cart.cartDiscount > 0) {
  appliedOffers.push({
    level: "cart",
    title: cart.cartOffer.title,
    type: cart.cartOffer.discountType,
    value: cart.cartOffer.discountValue,
    amount: cart.cartDiscount
  });
}
    return res.render("checkout", {
      user,
      cartItems,

        originalSubtotal,
  itemOfferDiscount,
  cartOfferDiscount,
  totalOfferDiscount,

      cartSubtotal: cart.totalPrice,
      cartDiscount: cart.cartDiscount || 0,
      cartOffer: cart.cartOffer || null,
      grandTotal: cart.grandTotal || cart.totalPrice,
       appliedOffers,

      hasStockIssue,
      addresses: user.addresses || [],
      selectedAddressId,
      error: req.session.errorMessage,
      success: req.session.successMessage,
    });

  } catch (error) {
    console.error("Error loading checkout:", error);
    req.session.errorMessage = "Failed to load checkout";
    return res.redirect("/cart");
  }
};


const placeOrder = async (req, res) => {
  try {

    
    const userId = req.session.userId;
    const { addressId, paymentMethod, couponCode } = req.body;
    console.log("coupon code:    ", couponCode)

    if (!addressId) {
      return res.redirect("/checkout?error=Please select an address");
    }

    if (!paymentMethod) {
      return res.redirect("/checkout?error=Please select a payment method");
    }

    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart?error=Your cart is empty");
    }

    const selectedAddress = user.addresses.id(addressId);

    if (!selectedAddress) {
      return res.redirect("/checkout?error=Invalid address");
    }

    let total = 0;
    const items = cart.items.map((item) => {
      const variant = item.variantId
        ? item.product.variants.id(item.variantId)
        : null;

      total += item.product.price * item.quantity;
      return {
        product: item.product._id,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: item.product.price,
      };
    });

    let discountAmount = 0;
let finalAmount = total;
let appliedCouponId = null;


    if (couponCode && couponCode.trim() !== "") {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isDeleted: false,
      });

      if (!coupon) {
        return res.redirect("/checkout?error=Invalid coupon");
      }

      if (new Date(coupon.expiryDate) < new Date()) {
        return res.redirect("/checkout?error=Coupon expired");
      }

      if (coupon.minPurchaseAmount && total < coupon.minPurchaseAmount) {
        return res.redirect(
          `/checkout?error=Minimum purchase required ₹${coupon.minPurchaseAmount}`
        );
      }

      if (coupon.discountType === "percentage") {
        discountAmount = (total * coupon.discountValue) / 100;

        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      } else {
    
        discountAmount = coupon.discountValue;
      }

      finalAmount = total - discountAmount;
      appliedCouponId = coupon._id;

      coupon.usedCount = (coupon.usedCount || 0) + 1;
      await coupon.save();
    }

    const newOrder = new Order({
      userId,
      items,
      totalAmount: total,
      discountAmount,
      finalAmount,
      couponId: appliedCouponId,
      address: selectedAddress,
      status: "Confirmed",
      paymentMethod: req.body.paymentMethod,
    });

    await newOrder.save();

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (variant) {
          variant.quantity -= item.quantity;
        }
      }

      product.totalStock = product.variants.reduce(
        (sum, v) => sum + v.quantity,
        0
      );
      await product.save();
    }

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    return res.redirect(`/order-success?orderId=${newOrder._id}`);
  } catch (error) {
    console.log("Order Error:", error);
    return res.redirect("/checkout?error=Something went wrong");
  }
};


const loadSuccessPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    let cartCount = 0;
    if (userId) {
      const cart = await Cart.findOne({ userId });
      cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    const { orderId } = req.query;
    if (!orderId) return res.redirect("/home");

    const order = await Order.findById(orderId).populate("items.product");
    if (!order) {
      return res.redirect("/home");
    }

    res.render("orderSuccess", {
      order,
      user,
      cartCount,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/home");
  }
};


module.exports = {
  loadCheckout,
  loadSuccessPage,
  placeOrder,
};
