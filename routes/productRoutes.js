const express = require("express");
const router = express.Router();
const Product = require("../models/product");

// GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render("products", { products }); // pass to products.ejs
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching products");
  }
});

module.exports = router;
