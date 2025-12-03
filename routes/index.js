const express = require("express");
const router = express.Router();
const product = require("../models/product");

router.get("/", async (req, res) => {
  const products = await product.find();
  res.render("index", { products });
});

router.get("/about-us", (req, res) => {
  res.render("about-us");
});

router.get("/contact-us", (req, res) => {
  res.render("contact-us");
});

module.exports = router;