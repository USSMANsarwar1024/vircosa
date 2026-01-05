// /routes/products.js
const express = require("express");
const router = express.Router();
const product = require("../models/product");
const Review = require('../models/review');
const Order = require('../models/order');
const { isLoggedIn } = require("../middleware/auth");
const mongoose = require("mongoose");


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
    req,
  });
});

router.get("/product-details/:slug", async (req, res) => {
  try {
    const productDetails = await product.findOne({ slug: req.params.slug });

    if (!productDetails) {
      return res.status(404).render("404", { message: "Product not found" });
    }

    const productId = productDetails._id;
    const userId = req.user?._id;

    // 2. Get Reviews
    const reviews = await Review.find({ product: productId }).populate("user", "firstname lastname").sort({ createdAt: -1 });


    // 3. Calculate overall rating
    const overallRating = reviews.length > 0
      ? Number(
          (
            reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          ).toFixed(1)
        )
      : 0;


    // 4. Featured products
    const featuredProducts = await product.find()
      .limit(8)
      .sort({ createdAt: -1 })
      .lean();

    // 5. ✅ CHECK IF USER CAN REVIEW THIS PRODUCT
    let canReview = false;
    let deliveredOrders = [];
    let hasReviewed = false;

    if (userId) {

      // Find all DELIVERED orders containing this product
      deliveredOrders = await Order.find({
        user: userId,
        "items.product": productId,
        orderStatus: "delivered"
      }).select("_id orderNumber");


      // Check if user already reviewed this product
      hasReviewed = await Review.exists({
        product: productId,
        user: userId
      });

      // User can review if they have delivered orders and haven't reviewed yet
      canReview = deliveredOrders.length > 0 && !hasReviewed;
    }

    // 6. Render Page
    res.render("product-details", {
      product: productDetails,
      featuredProducts,
      reviews,
      overallRating,
      canReview,          
      deliveredOrders,    
      hasReviewed,       
      req,
      boxPrice: productDetails.boxPrice || 700
    });

  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).render("500", { message: "Server error" });
  }
});

// add reviews
router.post("/product-details/:id/review", isLoggedIn, async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.id);
    const userId = req.user._id;
    const { rating, title, comment, orderId } = req.body;

    // 1. Validate input
    if (!rating || !comment || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Rating, comment, and order are required"
      });
    }

    // 2. ✅ VERIFY ORDER IS DELIVERED
    const Order = require('../models/order');
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      "items.product": productId,
      orderStatus: "delivered"
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message: "You can only review products from delivered orders"
      });
    }

    // 3. ✅ CHECK IF ALREADY REVIEWED
    const existingReview = await Review.findOne({
      product: productId,
      user: userId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product"
      });
    }

    // 4. CREATE REVIEW
    const newReview = new Review({
      product: productId,
      user: userId,
      order: orderId,
      rating: parseInt(rating),
      title: title?.trim(),
      comment: comment.trim()
    });

    await newReview.save();

    // 5. UPDATE PRODUCT RATINGS
    const allReviews = await Review.find({ product: productId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await product.findByIdAndUpdate(productId, {
      'ratings.average': Number(avgRating.toFixed(1)),
      'ratings.totalReviews': allReviews.length
    });

    res.json({
      success: true,
      message: "Review submitted successfully!"
    });

  } catch (err) {
    console.error("Review submission error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit review"
    });
  }
});


module.exports = router;
