const express = require("express");
const Cart = require("../../models/cartModel");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId);
    if (!user) return res.redirect("/login");

    const cart = await Cart.findOne({ userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      req.session.errorMessage = "Your cart is empty";
      return res.redirect("/cart");
    }

    let cartTotal = 0;
    let hasStockIssue = false;

    const cartItems = cart.items.map(item => {

      const product = item.product;
      const variant = item.variantId ? product.variants.id(item.variantId) : null;

      let isAvailable = true;
      let stockMessage = "";

      if (!product || product.status === false) {
        isAvailable = false;
        stockMessage = "Product unavailable";
        hasStockIssue = true;
      }

      if (product.category?.status === false) {
        isAvailable = false;
        stockMessage = "Category blocked";
        hasStockIssue = true;
      }

      if (variant) {
        if (variant.quantity <= 0) {
          isAvailable = false;
          stockMessage = "Out of stock";
          hasStockIssue = true;
        } else if (item.quantity > variant.quantity) {
          isAvailable = false;
          stockMessage = `Only ${variant.quantity} left in stock`;
          hasStockIssue = true;
        }
      }

      const itemTotal = isAvailable ? product.price * item.quantity : 0;
      cartTotal += itemTotal;

      return {
        product,
        quantity: item.quantity,
        variantId: item.variantId,
        selectedVariant: variant,
        isAvailable,
        stockMessage,
        itemTotal
      };
    });

    const defaultAddress =
      user.addresses?.find(a => a.isDefault) || null;

    const selectedAddressId =
      req.session.selectedAddressId ||
      (defaultAddress ? defaultAddress._id.toString() : null);

    return res.render("checkout", {
      user,
      cartItems,
      cartTotal,
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

//   try {
//     const userId = req.session.userId;

//     if (!userId) {
//       return res.redirect("/login");
//     }

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.redirect("/login");
//     }

//     const cart = await Cart.findOne({ userId }).populate("items.product");

//     if (!cart || !cart.items || cart.items.length === 0) {
//       req.session.errorMessage = "Your cart is empty";
//       return res.redirect("/cart");
//     }

//     let cartTotal = 0;

//     const cartItems =
//       cart && cart.items
//         ? cart.items.map((item) => {
//             const selectedVariant = item.variantId
//               ? item.product.variants.id(item.variantId)
//               : null;

//             const itemTotal = item.product.price * item.quantity;
//             cartTotal += itemTotal;
//             return {
//               product: item.product,
//               quantity: item.quantity,
//               variantId: item.variantId,
//               selectedVariant,
//               itemTotal,
//             };
//           })
//         : [];

//     const defaultAddress =
//       user.addresses && user.addresses.length > 0
//         ? user.addresses.find((addr) => addr.isDefault)
//         : null;
//     const selectedAddressId =
//       req.session.selectedAddressId ||
//       (defaultAddress ? defaultAddress._id.toString() : null);

//     res.render("checkout", {
//       user,
//       cartItems,
//       cartTotal,
//       addresses: user.addresses || [],
//       selectedAddressId,
//       error: req.session.errorMessage,
//       success: req.session.successMessage,
//     });

//     delete req.session.errorMessage;
//     delete req.session.successMessage;
//   } catch (error) {
//     console.error("Error loading checkout:", error);
//     req.session.errorMessage = "Failed to load checkout";
//     res.redirect("/cart");
//   }
// };

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { addressId, paymentMethod } = req.body;

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

    const newOrder = new Order({
      userId,
      items,
      totalAmount: total,
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
