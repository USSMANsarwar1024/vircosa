// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const userModel = require("../models/user");
const Product = require('../models/product');

const findUser = async (req) => {
    const user = await userModel
        .findOne({ email: req.user.email })
        .populate("cart.product");
    return user;
};

// Get cart page
router.get('/', isLoggedIn, async (req, res) => {
    try {
        const user = await findUser(req);
        if (!user) return res.redirect('/login');

        // Filter out items where product is null (deleted products)
        const validCartItems = user.cart.filter(item => item.product !== null);

        // If we removed some items, save the updated cart
        if (validCartItems.length !== user.cart.length) {
            console.log(`Removed ${user.cart.length - validCartItems.length} deleted products from cart`);
            user.cart = validCartItems;
            await user.save();
        }

        // Calculate subtotal
        let subtotal = 0;
        validCartItems.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        // Total items
        const total_items = validCartItems.reduce((sum, item) => sum + item.quantity, 0);

        const shipping = 300;
        const tax = subtotal * 0.17;
        const total = subtotal + shipping + tax;

        res.render("cart", {
            user,
            cartItems: validCartItems,
            subtotal,
            shipping,
            tax,
            total,
            total_items
        });

    } catch (err) {
        console.error("CART PAGE ERROR:", err);
        res.status(500).send("Server error");
    }
});

// Add to cart
router.post('/add', isLoggedIn, async (req, res) => {
    try {
        const { productId, size, price, quantity } = req.body;

        // Validate required fields
        if (!productId || !size || !price) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing variant details (productId, size, price required)'
            });
        }

        // Parse and validate quantity
        const qty = parseInt(quantity) || 1;
        if (qty < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quantity'
            });
        }

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        // Validate variant exists
        const variant = product.variants.find(v => v.size === Number(size));
        if (!variant) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid product variant selected' 
            });
        }

        // Validate stock
        if (variant.stock < qty) {
            return res.status(400).json({
                success: false,
                message: `Only ${variant.stock} items available in stock`
            });
        }

        // Validate price (prevent tampering)
        if (variant.price !== Number(price)) {
            return res.status(400).json({
                success: false,
                message: 'Price mismatch detected'
            });
        }

        // Load user
        const user = await userModel.findById(req.user._id);

        // Check if same variant already exists in cart
        const itemIndex = user.cart.findIndex(
            i => i.product.equals(productId) && i.size === Number(size)
        );

        if (itemIndex >= 0) {
            // Check if adding quantity exceeds stock
            const newQuantity = user.cart[itemIndex].quantity + qty;
            if (newQuantity > variant.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add ${qty} more. Only ${variant.stock} available in stock`
                });
            }
            user.cart[itemIndex].quantity = newQuantity;
        } else {
            // Add new variant to cart
            user.cart.push({
                product: productId,
                size: Number(size),
                price: Number(price),
                quantity: qty
            });
        }

        await user.save();

        return res.json({
            success: true,
            message: 'Product added to cart',
            cartCount: user.cart.reduce((acc, item) => acc + item.quantity, 0)
        });

    } catch (err) {
        console.error('Cart Add Error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Update cart quantity
router.post('/update', isLoggedIn, async (req, res) => {
    try {
        const { productId, size, action } = req.body;

        if (!productId || !size || !['increase', 'decrease'].includes(action)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid update request' 
            });
        }

        const user = await userModel.findById(req.user._id);

        // Find variant-specific cart entry
        const itemIndex = user.cart.findIndex(
            i => i.product.equals(productId) && i.size === Number(size)
        );

        if (itemIndex === -1) {
            return res.status(404).json({ 
                success: false,
                message: 'Item not found in cart' 
            });
        }

        let item = user.cart[itemIndex];

        // Handle increase or decrease
        if (action === "increase") {
            // Optional: Check stock before increasing
            const product = await Product.findById(productId);
            const variant = product.variants.find(v => v.size === Number(size));
            
            if (item.quantity >= variant.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add more. Only ${variant.stock} available in stock`
                });
            }
            
            item.quantity += 1;
        } else if (action === "decrease") {
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                // Remove item when quantity hits 0
                user.cart.splice(itemIndex, 1);
                await user.save();

                return res.json({
                    success: true,
                    removed: true
                });
            }
        }

        await user.save();

        // Recalculate totals
        let subtotal = 0;
        let total_items = 0;

        user.cart.forEach(ci => {
            subtotal += ci.price * ci.quantity;
            total_items += ci.quantity;
        });

        const tax = subtotal * 0.17;
        const shipping = 300;
        const total = subtotal + tax + shipping;

        res.json({
            success: true,
            newQuantity: item.quantity,
            subtotal,
            total_items,
            tax,
            shipping,
            total
        });

    } catch (err) {
        console.error("Cart Update Error:", err);
        res.status(500).json({ 
            success: false,
            message: "Server error during cart update" 
        });
    }
});

// Remove from cart
router.post('/remove', isLoggedIn, async (req, res) => {
    try {
        const { productId, size } = req.body;

        if (!productId || !size) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const user = await userModel.findById(req.user._id);

        user.cart = user.cart.filter(
            item => !(item.product.equals(productId) && item.size === Number(size))
        );

        await user.save();

        res.json({ success: true });

    } catch (err) {
        console.error("Cart Remove Error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
});

// Get cart count
router.get('/count', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id);
        
        if (!user) {
            return res.json({ count: 0 });
        }

        const count = user.cart.reduce((total, item) => total + item.quantity, 0);
        
        res.json({ count });
    } catch (err) {
        console.error("Cart count error:", err);
        res.json({ count: 0 });
    }
});

module.exports = router;