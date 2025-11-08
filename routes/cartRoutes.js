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

        // calculate total cart items
        let total_items = calculateCartTotals;
        
        const shipping = 300;
        const tax = subtotal * 0.17;
        const total = subtotal + shipping + tax;

        res.render("cart", {
            user,
            cartItems,
            subtotal,
            shipping,
            tax,
            total,
            total_items,
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});


// /routes/cart.js
router.post('/add', isLoggedIn, async (req, res) => {
    try {
        const { productId } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'Product not found');
            return res.status(404).json({ message: 'Product not found' });
        }

        const user = await userModel.findById(req.user._id);
        const itemIndex = user.cart.findIndex(i => i.product.equals(product._id));

        if (itemIndex >= 0) {
            user.cart[itemIndex].quantity += 1;
        } else {
            user.cart.push({ product: product._id, quantity: 1 });
        }

        await user.save();
        
        // Use flash for success message
        req.flash('success', 'Product added to cart successfully!');
        res.json({ success: true, message: 'Product added to cart' });
    } catch (err) {
        req.flash('error', 'Server error occurred');
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/update', isLoggedIn, async (req, res) => {
    try {
        const { productId, action } = req.body;
        
        if (!['increase', 'decrease'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action specified' });
        }

        const user = await userModel.findById(req.user._id);
        const itemIndex = user.cart.findIndex(i => i.product.equals(productId));

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        let item = user.cart[itemIndex];

        if (action === 'increase') {
            item.quantity += 1;
        } else if (action === 'decrease') {
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                // If quantity is 1 and they try to decrease, remove the item
                user.cart.splice(itemIndex, 1);
            }
        }
        
        await user.save();

        // Recalculate totals for the response
        const newTotals = calculateCartTotals(user.cart);

        res.json({ 
            success: true, 
            newQuantity: item.quantity, 
            ...newTotals // Send updated totals back to the frontend
        });

    } catch (err) {
        console.error("Cart Update Error: ", err);
        res.status(500).json({ message: 'Server Error during cart update' });
    }
});

// Helper function to calculate totals (optional, but good practice)
function calculateCartTotals(cartItems) {
    let subtotal = 0;
    let total_items = 0;

    cartItems.forEach(item => {
        total_items += item.quantity;
    });

    return { total_items };
}



module.exports = router;
