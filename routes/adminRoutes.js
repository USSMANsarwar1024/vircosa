const express = require("express");
const router = express.Router();
const Product = require("../models/product");  // Capital P (model)
const Order = require("../models/order");      // Capital O
const multer = require("multer");
const path = require("path");

// ============================
// Multer storage configuration
// ============================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/products");
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname.replace(/\s+/g, "_"));
  },
});
const upload = multer({ storage });

// ============================
// Admin Dashboard
// ============================
router.get("/", async (req, res) => {
  try {
    // Fetch stats
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysOrdersCount = await Order.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    // Total revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue =
      revenueResult[0] && revenueResult[0].totalRevenue
        ? revenueResult[0].totalRevenue
        : 0;

    // Today's revenue
    const todayRevenueResult = await Order.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, todayRevenue: { $sum: "$totalAmount" } } },
    ]);
    const todayRevenue =
      todayRevenueResult[0] && todayRevenueResult[0].todayRevenue
        ? todayRevenueResult[0].todayRevenue
        : 0;

    // Fetch all products
    const products = await Product.find().sort({ createdAt: -1 }).limit(50);

    // Render once
    res.render("admin", {
      products,
      stats: {
        totalProducts,
        totalOrders,
        todaysOrdersCount,
        totalRevenue,
        todayRevenue,
      },
    });
  } catch (err) {
    console.error("Error loading admin panel:", err);
    if (!res.headersSent) res.status(500).send("Server error loading admin panel");
  }
});

// ============================
// Add Product
// ============================
router.post("/add", upload.array("images[]"), async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      price,
      productBadge,
      shippingFee = 0,
      tax = 0,
      stock = 0,
    } = req.body;

    const images = [];
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        images.push("/uploads/products/" + f.filename);
      }
    }

    if (images.length === 0) {
      // If no flash middleware, just redirect with query param
      return res.redirect("/admin?msg=no-image");
    }

    const newProduct = new Product({
      name,
      category,
      description,
      price: Number(price || 0),
      images,
      productBadge,
      shippingFee: Number(shippingFee || 0),
      tax: Number(tax || 0),
      stock: Number(stock || 0),
    });

    await newProduct.save();

    res.redirect("/admin?msg=added");
  } catch (err) {
    console.error("Error adding product:", err);
    if (!res.headersSent) res.status(500).send("Server error adding product");
  }
});

// ============================
// Delete Product
// ============================
router.post("/delete/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting product");
  }
});

module.exports = router;
