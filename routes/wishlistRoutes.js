// /routes/wishlistRoute.js
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const userModel = require("../models/user");
const product = require("../models/product");

// GET wishlist page
router.get('/', isLoggedIn, async (req, res) => {
    try {
        // Get user with populated wishlist
        const user = await userModel
            .findOne({ email: req.user.email })
            .populate('wishlist');

        if (!user) {
            return res.redirect('/login');
        }

        // The wishlist is already populated with full product details
        const wishlistItems = user.wishlist || [];

        res.render('wishlist', {
            user,
            wishlistItems
        });
    } catch (err) {
        console.error('Error loading wishlist:', err);
        res.status(500).render('500', { 
            message: 'Failed to load wishlist' 
        });
    }
});

// POST add to wishlist
router.post('/add', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ 
                success: false,
                message: 'Product not found' 
            });
        }

        // Verify product exists
        const productExists = await product.findById(productId);
        if (!productExists) {
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }

        // Check if product already in wishlist
        if (user.wishlist.includes(productId)) {
            return res.status(400).json({ 
                success: false,
                message: 'Product already in wishlist' 
            });
        }

        // Add to wishlist
        user.wishlist.push(productId);
        await user.save();

        res.json({ 
            success: true, 
            message: 'Product added to wishlist' 
        });
    } catch (err) {
        console.error('Error adding to wishlist:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error occurred' 
        });
    }
});

// POST remove product from wishlist
router.post("/remove-product", isLoggedIn, async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ 
                success: false,
                message: 'Product ID required' 
            });
        }

        await userModel.findByIdAndUpdate(
            req.user._id, 
            { $pull: { wishlist: productId } }
        );

        res.json({ 
            success: true,
            message: 'Product removed from wishlist' 
        });
    } catch (err) {
        console.error('Error removing product:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// POST remove all from wishlist
router.post('/remove-all', isLoggedIn, async (req, res) => {
    try {
        await userModel.findByIdAndUpdate(
            req.user._id, 
            { $set: { wishlist: [] } }
        );

        res.json({ 
            success: true,
            message: 'Wishlist cleared successfully' 
        });
    } catch (err) {
        console.error('Error clearing wishlist:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

module.exports = router;