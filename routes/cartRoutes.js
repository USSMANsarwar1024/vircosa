// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const userModel = require("../models/user");
const Product = require('../models/product');

const findUser = async (req) => {
    const user = await userModel
        .findOne({ email: req.user.email })
        .populate("cart.product"); // populate product details
    return user;
};


router.get('/', isLoggedIn, async (req, res) => {
    try {
        const user = await findUser(req);
        if (!user) return res.redirect('/login');

        const cartItems = user.cart;

        // calculate totals
        let subtotal = 0;
        cartItems.forEach(item => {
            subtotal += item.product.price * item.quantity;
        });

        const shipping = 300;
        const tax = subtotal * 0.17;
        const total = subtotal + shipping + tax;

        res.render("cart", {
            user,
            cartItems,
            subtotal,
            shipping,
            tax,
            total
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});


router.post('/add', isLoggedIn, async (req, res) => {
    try {
        const { productId } = req.body;
        console.log("Incoming add-to-cart request for productId:", productId);

        const product = await Product.findById(productId);
        if (!product) {
            console.log("Product not found!");
            return res.status(404).json({ message: 'Product not found' });
        }

    const user = await userModel.findById(req.user._id);
        console.log("User found:", user.email);

        const itemIndex = user.cart.findIndex(i => i.product.equals(product._id));

        if (itemIndex >= 0) {
            user.cart[itemIndex].quantity += 1;
        } else {
            user.cart.push({ product: product._id, quantity: 1 });
        }

        await user.save();
        console.log("Cart updated successfully!");
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Error adding to cart:", err);
        res.status(500).json({ message: 'Error adding to cart' });
    }
});



module.exports = router;
