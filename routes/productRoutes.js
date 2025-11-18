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

    res.render("product-details", { product: productDetails });
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).render("500", { message: "Server error fetching product details" });
  }
});


module.exports = router;
