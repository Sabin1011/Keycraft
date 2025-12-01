const express = require("express");
const Product = require("../../models/productSchema");
const router = express.Router();
const Category = require("../../models/categorySchema");
const Wishlist = require("../../models/wishlistModel")
const Cart = require("../../models/cartModel");

const loadCart = async(req, res)=>{
    try {

        const userId = req.session.user?._id;

        if(!userId){
            return res.redirect("/login")
        }

        const message = req.session.message;
        const messageType = req.session.messageType;
        delete req.session.message;
        delete req.session.messageType;

        let cart = await Cart.findOne({userId})
        .populate({
            path:'items.product',
            populate:{
                path:"category"
            }
        })

        if(!cart){
            cart = new Cart({
                userId,
                items:[],
                totalPrice:0
            });
            await cart.save();
        }

        let invalidItemExists = false;


        for(let item of cart.items){

            item.isAvailable = true;
            item.outOfStockMessage = "";

            // if product is blocked
            if(!item.product || item.product.status !== true){
                item.isAvailable = false;
                item.outOfStockMessage = "Product unavailable";
                invalidItemExists = true;
            }
            
            // if category is blocked.
            else if(!item.product.category || item.product.category.status !== true){
                item.isAvailable =  false;
                item.outOfStockMessage = "Category unavailable";
                invalidItemExists = true;
               
            }

            else if(item.product.totalStock <= 0){
                item.isAvailable = false;
                item.outOfStockMessage = "out of stock";
                invalidItemExists = true;
            }


            else if(item.quantity > item.product.totalStock){
                item.isAvailable = false;
                item.outOfStockMessage = `Only ${item.product.totalStock} left in stock`;
                item.quantity = item.product.totalStock;
                invalidItemExists = true;
            }
        }

        cart.totalPrice = cart.items
        .filter(i=>i.isAvailable)
        .reduce((sum, i) => sum + i.product.price * i.quantity, 0);

        await cart.save


        return res.render("cart",{
            cart,
            invalidItemExists,
            message: message || null,
            messageType: messageType || null
        });
        
    } catch (error) {
       console.log("An error occurred in loadCart: ", error);
        return res.render("cart", { 
            cart: { items: [], totalPrice: 0 },
            message: null,
            messageType: null
        });
    }
}

const addToCart = async (req, res)=>{
    try {
        const userId = req.session.user._id;
        const productId = req.params.id;
        const quantity = parseInt(req.body.quantity) || 1;

        if(!userId){
            return res.redirect("/login");
        }

        const product = await Product.findById(productId).populate('category');

        if(!product){
            req.session.message = 'product not found';
            req.session.messageType = 'error';
            return res.redirect("/shop");
        }

        if(product.status !== true){
            req.session.message = 'this product is currently unavailable';
            req.session.messageType = 'error';
            return res.redirect('/shop');
        }

        if(!product.category || product.category.status !== true){
            req.session.message = 'this product category is currently unavailable';
            req.session.messageType = 'error';
            return res.redirect("/shop");
        }

        if(product.totalStock <=0){
            req.session.message = "Sorry this product is out of stock";
            req.session.messageType = "error";
            return res.redirect("/shop")
        }

        if(quantity > product.totalStock){
            req.session.message = `Only ${product.totalStock} items available in stock`;
            req.session.messageType = 'error';
            return res.redirect("/shop");
        }

        let cart = await Cart.findOne({userId});

        if(!cart) {
            cart = new Cart({
                userId,
                items: [],
                totalPrice: 0
            });
        }

        const existingItemIndex = cart.items.findIndex(
            item =>item.product.toString() === productId
        );

        if(existingItemIndex > -1) {
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;

            if(newQuantity > product.totalStock) {
                req.session.message = `Cannot add more . only ${product.totalStock} items available in stock`;
                req.session.messageType = 'error';
                return res.redirect("/shop");
            }
            cart.items[existingItemIndex].quantity = newQuantity;
        }else{
            cart.items.push({
                product: productId,
                quantity
            });
        }

        await cart.populate({
            path: 'items.product',
            populate:{
                path:'category'
            }
        });

        cart.totalPrice = cart.items.reduce((total, item)=>{
            return total + (item.product.price * item.quantity);
        },0);

        await cart.save();
        req.session.message = 'Product added to cart successfully';
        req.session.messageType = 'success';

        await Wishlist.updateOne({userId},{$pull:{products:{productId: productId}}}) ;

        return res.redirect("/cart");

    } catch (error) {
        console.log("An error occurred in addToCart: ", error);
        req.session.message = 'Failed to add product to cart';
        req.session.messageType = 'error';
        return res.redirect("/shop");
    }
}

const increaseQuantity = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.id;

        if (!userId) {
            return res.redirect("/login");
        }

        const cart = await Cart.findOne({ userId });
        const product = await Product.findById(productId);

        if (!cart || !product) {
            return res.redirect("/cart");
        }

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex > -1) {
            
            const newQuantity = cart.items[itemIndex].quantity + 1;

            const MAX_LIMIT = 6;

            if(newQuantity > MAX_LIMIT){
                req.session.message = `Maximun quantity limit is ${MAX_LIMIT}`;
                req.session.messageType = "error";
                return res.redirect("/cart");
            }

            if (newQuantity > product.totalStock) {
                req.session.message = `Only ${product.totalStock} items available in stock`;
                req.session.messageType = 'error';
                return res.redirect("/cart");
            }

            cart.items[itemIndex].quantity = newQuantity;

            // Recalculate total
            await cart.populate({
                path: 'items.product',
                populate: { path: 'category' }
            });

            cart.totalPrice = cart.items.reduce((total, item) => {
                return total + (item.product.price * item.quantity);
            }, 0);

            await cart.save();
        }

        return res.redirect("/cart");

    } catch (error) {
        console.log("An error occurred in increaseQuantity: ", error);
        return res.redirect("/cart");
    }
}

const decreaseQuantity = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.id;

        if (!userId) {
            return res.redirect("/login");
        }

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.redirect("/cart");
        }

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity -= 1;

            // If quantity becomes 0, remove the item
            if (cart.items[itemIndex].quantity <= 0) {
                cart.items.splice(itemIndex, 1);
            }

            // Recalculate total
            await cart.populate({
                path: 'items.product',
                populate: { path: 'category' }
            });

            cart.totalPrice = cart.items.reduce((total, item) => {
                return total + (item.product.price * item.quantity);
            }, 0);

            await cart.save();
        }

        return res.redirect("/cart");

    } catch (error) {
        console.log("An error occurred in decreaseQuantity: ", error);
        return res.redirect("/cart");
    }
}

const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.id;

        if (!userId) {
            return res.redirect("/login");
        }

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.redirect("/cart");
        }

        // Remove the item from cart
        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );

        // Recalculate total
        await cart.populate({
            path: 'items.product',
            populate: { path: 'category' }
        });

        cart.totalPrice = cart.items.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);

        await cart.save();

        req.session.message = 'Product removed from cart';
        req.session.messageType = 'success';
        return res.redirect("/cart");

    } catch (error) {
        console.log("An error occurred in removeFromCart: ", error);
        return res.redirect("/cart");
    }
}


module.exports ={
    loadCart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart


}