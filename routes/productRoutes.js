// /routes/products.js
const express = require("express");
const router = express.Router();
const product = require("../models/product");
const Review = require('../models/review');
const Order = require('../models/order');
const { isLoggedIn } = require("../middleware/auth");

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 8;
  const skip = (page - 1) * limit;

  const totalproducts = await product.countDocuments();
  const totalPages = Math.ceil(totalproducts / limit);

  const products = await product.find().skip(skip).limit(limit);


  res.render("products", {
    products,
    currentPage: page,
    totalPages,
  });
});

router.get("/product-details/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const openReview = req.query.openReview === 'true';

    // 1. Get Product Details
    const productDetails = await product.findById(productId);

    if (!productDetails) {
      return res.status(404).render("404", { message: "Product not found" });
    }

    // 2. Get Reviews
    const reviews = await Review.find({ product: productId })
      .populate("user", "firstname lastname")
      .sort({ createdAt: -1 });

    // 3. Calculate overall rating
    const overallRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // 4. Check if user can review (only if logged in)
    let canReview = false;
    let hasReviewed = false;
    
    if (req.user) {
      // Check if user has reviewed this product
      hasReviewed = await Review.findOne({
        product: productId,
        user: req.user._id
      });

      // Check if user has a delivered order with this product
      const deliveredOrder = await Order.findOne({
        user: req.user._id,
        orderStatus: 'delivered',
        'items.product': productId
      });

      canReview = deliveredOrder && !hasReviewed;
    }

    // 5. Featured products
    const featuredProducts = await product.find()
      .limit(8)
      .sort({ createdAt: -1 })
      .lean();

    // 6. Render Page
    res.render("product-details", {
      product: productDetails,
      featuredProducts,
      reviews,
      overallRating,
      canReview,
      hasReviewed: !!hasReviewed,
      openReview, // Pass this to auto-open modal
    });

  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).render("500", { message: "Server error" });
  }
});

// POST - Submit Review
router.post("/product-details/:id/review", isLoggedIn, async (req, res) => {
  try {
    const productId = req.params.id;
    const { rating, title, comment } = req.body;

    // Validation
    if (!rating || !comment || comment.length < 10) {
      return res.json({ 
        success: false, 
        message: "Please provide a rating and comment (minimum 10 characters)" 
      });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id
    });

    if (existingReview) {
      return res.json({ 
        success: false, 
        message: "You have already reviewed this product" 
      });
    }

    // Check if user has delivered order with this product
    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      orderStatus: 'delivered',
      'items.product': productId
    });

    if (!deliveredOrder) {
      return res.json({ 
        success: false, 
        message: "You can only review products you've purchased and received" 
      });
    }

    // Create review
    const newReview = new Review({
      product: productId,
      user: req.user._id,
      rating: parseInt(rating),
      title: title || '',
      comment: comment
    });

    await newReview.save();

    return res.json({ 
      success: true, 
      message: "Review submitted successfully!" 
    });

  } catch (err) {
    console.error("Review submission error:", err);
    return res.json({ 
      success: false, 
      message: "Failed to submit review" 
    });
  }
});


module.exports = router;
