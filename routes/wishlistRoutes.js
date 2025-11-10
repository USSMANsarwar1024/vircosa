// /routes/wishlistRoute.js
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const userModel = require("../models/user"); 
const product = require('../models/product');

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

// router.post('/add', isLoggedIn, async (req, res) => {
//   const user = await userModel.findOne({ email: req.user.email });
//   const { productId } = req.body;

//   if (!user.wishlist.includes(productId)) {
//     user.wishlist.push(productId);
//     await user.save();
//   }

//   res.status(200).json({ success: true });
// });

module.exports = router;