const express = require("express");
const Product = require("../../models/productSchema");
const router = express.Router();
const Category = require("../../models/categorySchema");
const Wishlist = require("../../models/wishlistModel");
const Cart = require("../../models/cartModel");
const User = require("../../models/userSchema");

const loadCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!userId) {
      return res.redirect("/login");
    }

    const message = req.session.message;
    const messageType = req.session.messageType;
    delete req.session.message;
    delete req.session.messageType;

    let cart = await Cart.findOne({ userId }).populate({
      path: "items.product",
      populate: {
        path: "category",
      },
    });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        totalPrice: 0,
      });
      await cart.save();
    }

    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    let invalidItemExists = false;

    for (let item of cart.items) {
      item.selectedVariant = item.variantId
        ? item.product.variants.id(item.variantId)
        : null;

      item.isAvailable = true;
      item.outOfStockMessage = "";

      if (!item.product || item.product.status !== true) {
        item.isAvailable = false;
        item.outOfStockMessage = "Product unavailable";
        invalidItemExists = true;
      } 
      if (item.selectedVariant && item.selectedVariant.quantity <= 0) {
        item.isAvailable = false;
        item.outOfStockMessage = `The selected variant (${item.selectedVariant.name}) is out of stock`;
        invalidItemExists = true;
      }
      else if (item.selectedVariant && item.quantity > item.selectedVariant.quantity) {
        item.isAvailable = false;
        item.outOfStockMessage = `Only ${item.selectedVariant.quantity} left for ${item.selectedVariant.name}`;
        item.quantity = item.selectedVariant.quantity; 
        invalidItemExists = true;
      }
      else if (
        !item.product.category ||
        item.product.category.status !== true
      ) {
        item.isAvailable = false;
        item.outOfStockMessage = "Category unavailable";
        invalidItemExists = true;
      } else if (item.product.totalStock <= 0) {
        item.isAvailable = false;
        item.outOfStockMessage = "out of stock";
        invalidItemExists = true;
      } else if (item.quantity > item.product.totalStock) {
        item.isAvailable = false;
        item.outOfStockMessage = `Only ${item.product.totalStock} left in stock`;
        item.quantity = item.product.totalStock;
        invalidItemExists = true;
      }
    }

    cart.totalPrice = cart.items
      .filter((i) => i.isAvailable)
      .reduce((sum, i) => sum + i.product.price * i.quantity, 0);

    await cart.save();

    return res.render("cart", {
      cartCount,
      user,
      cart,
      invalidItemExists,
      message: message || null,
      messageType: messageType || null,
      
    });
  } catch (error) {
    console.log("An error occurred in loadCart: ", error);
    return res.render("cart", {
      cart: { items: [], totalPrice: 0 },
      message: null,
      messageType: null,
    });
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.id;
    console.log("user id : ", userId);
    const quantity = parseInt(req.body.quantity) || 1;

    let variantId = req.body.variantId || null;

    const backURL = req.get("Referer") || "/shop";

    if (!userId) {
      return res.redirect("/login");
    }

    const product = await Product.findById(productId).populate("category");

    if (!variantId && product.variants && product.variants.length > 0) {
      variantId = product.variants[0]._id.toString();
    }
    if (!product) {
      req.session.message = "product not found";
      req.session.messageType = "error";
      return res.redirect("/shop");
    }

    if (product.status !== true) {
      req.session.message = "this product is currently unavailable";
      req.session.messageType = "error";
      return res.redirect("/shop");
    }

    if (!product.category || product.category.status !== true) {
      req.session.message = "this product category is currently unavailable";
      req.session.messageType = "error";
      return res.redirect("/shop");
    }

    if (product.totalStock <= 0) {
      req.session.message = "Sorry this product is out of stock";
      req.session.messageType = "error";
      return res.redirect("/shop");
    }

    if (quantity > product.totalStock) {
      req.session.message = `Only ${product.totalStock} items available in stock`;
      req.session.messageType = "error";
      return res.redirect("/shop");
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        totalPrice: 0,
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.variantId ? item.variantId.toString() : null) ===
          (variantId ? variantId.toString() : null)
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex]?.quantity + quantity;

      const MAX_LIMIT = 6;
      if (newQuantity > MAX_LIMIT) {
        req.session.message = `Maximum quantity limit is ${MAX_LIMIT}`;
        req.session.messageType = "error";
        return res.redirect("/cart");
      }

      if (newQuantity > product.totalStock) {
        req.session.message = `Cannot add more . only ${product.totalStock} items available in stock`;
        req.session.messageType = "error";
        return res.redirect("/shop");
      }
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        product: productId,
        variantId: variantId,
        quantity,
      });
    }

    await cart.populate({
      path: "items.product",
      populate: {
        path: "category",
      },
    });

    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    await cart.save();
    req.session.message = "Product added to cart successfully";
    req.session.messageType = "success";

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId: productId } } }
    );
    return res.redirect(backURL);
  } catch (error) {
    console.log("An error occurred in addToCart: ", error);
    req.session.message = "Failed to add product to cart";
    req.session.messageType = "error";
    return res.redirect("/shop");
  }
};

const increaseQuantity = async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.id;
    const variantId = req.query.variantId || null;

    if (!userId) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId });
    const product = await Product.findById(productId);

    if (!cart || !product) {
      return res.redirect("/cart");
    }

    const itemIndex = cart.items.findIndex((item) => {
      const itemVariant = item.variantId ? item.variantId.toString() : null;
      const targetVariant = variantId ? variantId.toString() : null;
      return (
        item.product.toString() === productId && itemVariant === targetVariant
      );
    });

    if (itemIndex > -1) {
      const newQuantity = cart.items[itemIndex].quantity + 1;

      const MAX_LIMIT = 6;

      if (newQuantity > MAX_LIMIT) {
        req.session.message = `Maximun quantity limit is ${MAX_LIMIT}`;
        req.session.messageType = "error";
        return res.redirect("/cart");
      }

      if (newQuantity > product.totalStock) {
        req.session.message = `Only ${product.totalStock} items available in stock`;
        req.session.messageType = "error";
        return res.redirect("/cart");
      }

      cart.items[itemIndex].quantity = newQuantity;

      await cart.populate({
        path: "items.product",
        populate: { path: "category" },
      });

      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + item.product.price * item.quantity;
      }, 0);

      await cart.save();
    }
    if (req.xhr) {
      if (itemIndex === -1) {
        return res.json({ success: false, message: "Item not found" });
      }
      const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      return res.json({
        success: true,
        quantity: cart.items[itemIndex].quantity,
        totalPrice: cart.totalPrice,
        unitPrice: cart.items[itemIndex].product.price,
        totalItems
        
      });
    }

    return res.redirect("/cart");
  } catch (error) {
    console.log("An error occurred in increaseQuantity: ", error);
    return res.redirect("/cart");
  }
};

const decreaseQuantity = async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.id;
    const variantId = req.query.variantId || null;

    if (!userId) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.redirect("/cart");
    }

    const itemIndex = cart.items.findIndex((item) => {
      const variants = item.variantId ? item.variantId.toString() : null;
      const targetVariant = variantId ? variantId.toString() : null;
      return (
        item.product.toString() === productId && variants === targetVariant
      );
    });

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity -= 1;

      if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      }

      await cart.populate({
        path: "items.product",
        populate: { path: "category" },
      });

      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + item.product.price * item.quantity;
      }, 0);

      await cart.save();
    }
    if (req.xhr) {
      if (itemIndex === -1) {
        return res.json({ success: false, message: "Item not found" });
      }
            const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      return res.json({
        success: true,
        quantity: cart.items[itemIndex]?.quantity || 0,
        totalPrice: cart.totalPrice,
        unitPrice: cart.items[itemIndex]?.product.price || 0,
        totalItems
      });
    }

    return res.redirect("/cart");
  } catch (error) {
    console.log("An error occurred in decreaseQuantity: ", error);
    return res.redirect("/cart");
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.id;
    const variantId = req.query.variantId || null;

    if (!userId) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.redirect("/cart");
    }

    const initialItemCount = cart.items.length;

    cart.items = cart.items.filter((item) => {
      const itemVariant = item.variantId ? item.variantId.toString() : null;
      const removeVariant = variantId ? variantId.toString() : null;

      return !(
        item.product.toString() === productId && itemVariant === removeVariant
      );
    });

    await cart.populate({
      path: "items.product",
      populate: { path: "category" },
    });

    const itemRemoved = cart.items.length < initialItemCount;

    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    await cart.save();

    if (req.xhr) {
      if (!itemRemoved) {
        return res.json({ success: false, message: "Item not found or Already removed" });
      }
                  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      return res.json({
        success: true,
        totalPrice: cart.totalPrice,
        totalItems

      });
    }

    req.session.message = "Product removed from cart";
    req.session.messageType = "success";
    return res.redirect("/cart");
  } catch (error) {
    console.log("An error occurred in removeFromCart: ", error);
    return res.redirect("/cart");
  }
};

module.exports = {
  loadCart,
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
};
