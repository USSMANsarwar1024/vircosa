const express = require("express");
const router = express.Router();
const product = require("../models/product");

// GET all products
// router.get("/", async (req, res) => {
//   try {
//     const products = await product.find().sort({ createdAt: -1 });
//     res.render("products", { products }); // pass to products.ejs
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching products");
//   }
// });

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

module.exports = router;
