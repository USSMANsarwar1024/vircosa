const express = require("express");
const router = express.Router();
const product = require("../models/product");

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
    const productDetails = await product.findById(productId);

    if (!productDetails) {
      return res.status(404).render("404", { message: "Product not found" });
    }

    const featuredProducts = await product.find()
      .limit(8) // Get 8 products for the marquee
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean(); // Use lean() for better performance

    res.render("product-details", {
      product: productDetails,
      featuredProducts,
    });
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).render("500", { message: "Server error fetching product details" });
  }
});


module.exports = router;
