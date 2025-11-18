// /routes/wishlistRoute.js
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const userModel = require("../models/user");
const productModel = require('../models/product');

const findUser = async (req) => {
    const user = await userModel
        .findOne({ email: req.user.email })
        .populate("wishlist"); // ✅ correct populate path
    return user;
};


router.get('/', isLoggedIn, async (req, res) => {
    const user = await findUser(req);
    if (!user) return res.redirect('/login');

    const wishlistItems = user.wishlist;

    res.render('wishlist', {
        user,
        wishlistItems, // wishlistItems.product -> all details of a product in ejs
    });
})


router.post('/add', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        const { productId } = req.body;

        if (!productId) {
            req.flash('error', 'Product not found');
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if product already in wishlist
        if (user.wishlist.includes(productId)) {
            req.flash('info', 'Product already in wishlist');
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        user.wishlist.push(productId);
        await user.save();

        req.flash('success', 'Product added to wishlist!');
        res.json({ success: true, message: 'Product added to wishlist' });
    } catch (err) {
        req.flash('error', 'Server error occurred');
        res.status(500).json({ message: 'Server Error' });
    }
});

// href="/wishlist/remove-product/<%= item._id %>"
//  Remove product from wishlist
router.post("/remove-product", isLoggedIn, async (req, res) => {
    const { productId } = req.body;
    try {
        await userModel.findByIdAndUpdate(req.user._id, { $pull: { wishlist: productId } });
        res.json({ success: true });
    } catch (err) {
        console.error('Error removing product:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/remove-all', isLoggedIn, async (req, res) => {
  try {
    await userModel.findByIdAndUpdate(req.user._id, { $set: { wishlist: [] } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});





module.exports = router;