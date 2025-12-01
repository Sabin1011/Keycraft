const express = require("express");
const Cart = require("../../models/cartModel")
const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema");



const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.redirect('/login');
    }


    const cart = await Cart.findOne({ userId }).populate('items.product');

    let cartTotal = 0;
    const cartItems = cart && cart.items ? cart.items.map(item => {
      const itemTotal = item.product.price * item.quantity;
      cartTotal += itemTotal;
      return {
        product: item.product,
        quantity: item.quantity,
        itemTotal
      };
    }) : [];

    if (!cart || !cart.items || cart.items.length === 0) {
      req.session.errorMessage = 'Your cart is empty';
      return res.redirect('/cart');
    }

    const defaultAddress = user.addresses && user.addresses.length > 0 
      ? user.addresses.find(addr => addr.isDefault) 
      : null;
    const selectedAddressId = req.session.selectedAddressId || (defaultAddress ? defaultAddress._id.toString() : null);

    res.render('checkout', {
      user,
      cartItems,
      cartTotal,
      addresses: user.addresses || [],
      selectedAddressId,
      error: req.session.errorMessage,
      success: req.session.successMessage
    });

    delete req.session.errorMessage;
    delete req.session.successMessage;
  } catch (error) {
    console.error('Error loading checkout:', error);
    req.session.errorMessage = 'Failed to load checkout';
    res.redirect('/cart');
  }
};


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
    const items = cart.items.map(item => {
      total += item.product.price * item.quantity;
      return {
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      };
    });
    
    const newOrder = new Order({
      userId,
      items,
      totalAmount: total,
      address: selectedAddress,
      status: "Confirmed",
      paymentMethod: req.body.paymentMethod
    });

    await newOrder.save();


    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } }
    );

    return res.redirect(`/order-success?orderId=${newOrder._id}`);

  } catch (error) {
    console.log("Order Error:", error);
    return res.redirect("/checkout?error=Something went wrong");
  }
};

const loadSuccessPage = async (req, res)=>{
    try {

        const {orderId} = req.query;
        if (!orderId) return res.redirect("/home");

        const order = await Order.findById(orderId).populate("items.product");
        if(!order){
            return res.redirect("/home")
        }

        res.render("orderSuccess",{
            order
        })
    } catch (error) {
        console.log(error);
        res.redirect("/home");
    }
}   

const loadOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate("items.product");
    if (!order) return res.redirect("/home");

    res.render("orderDetails", { order });
  } catch (error) {
    console.log("Order Details Error:", error);
    res.redirect("/home");
  }
};

module.exports ={
    loadCheckout,
    loadSuccessPage,
    placeOrder,
    loadOrderDetails
}