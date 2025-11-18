const express = require("express");
const router = express.Router();
const Product = require("../models/product"); // Capital P (model)
const Order = require("../models/order"); // Capital O
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
    const perPage = 8;
    const page = parseInt(req.query.page) || 1;

    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysOrdersCount = await Order.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const revenueResult = await Order.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    const todayRevenueResult = await Order.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: null, todayRevenue: { $sum: "$totalAmount" } } },
    ]);

    const todayRevenue = todayRevenueResult[0]?.todayRevenue || 0;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    const totalPages = Math.ceil(totalProducts / perPage);

    res.render("admin", {
      products,
      stats: {
        totalProducts,
        totalOrders,
        todaysOrdersCount,
        totalRevenue,
        todayRevenue,
      },
      pagination: {
        currentPage: page,
        totalPages,
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
      description,
      // price,
      productBadge,
      shippingFee = 0,
      tax = 0,
      sku,
      lasting,
      concentration,
    } = req.body;

    // Ensuring categories always becomes an array
    let categories = req.body.categories;
    if (!categories) categories = [];
    if (!Array.isArray(categories)) categories = [categories];

    let sizes = req.body.sizes || [];
    let prices = req.body.prices || [];
    let variantStock = req.body.variantStock || [];

    if (!Array.isArray(sizes)) sizes = [sizes];
    if (!Array.isArray(prices)) prices = [prices];
    if (!Array.isArray(variantStock)) variantStock = [variantStock];

    const variants = sizes.map((s, i) => ({
        size: Number(s),
        price: Number(prices[i] || 0),
        stock: Number(variantStock[i] || 0)
    }));



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
      description,
      images,
      productBadge,
      shippingFee: Number(shippingFee || 0),
      tax: Number(tax || 0),
      sku,
      categories,
      sizes,
      lasting,
      concentration,
      variants,
    });

    await newProduct.save();

    res.redirect("/admin?msg=added");
  } catch (err) {
    console.error("Error adding product:", err);
    if (!res.headersSent) res.status(500).send("Server error adding product");
  }
});

// ============================
// Edit Product
// ============================
router.post("/edit/:id", upload.array("images[]"), async (req, res) => {
  try {
    const {
      name,
      categories,
      description,
      price,
      productBadge,
      shippingFee = 0,
      tax = 0,
      stock = 0,
      sku,
      lasting,
      concentration,
      sizes
    } = req.body;

    const updateData = {
      name,
      description,
      price: Number(price || 0),
      productBadge: productBadge || undefined,
      shippingFee: Number(shippingFee || 0),
      tax: Number(tax || 0),
      stock: Number(stock || 0),
      sku: sku || undefined,
      lasting: lasting || "8-10 Hours",
      concentration: Number(concentration || 40),
    };

    // Handle categories array
    if (categories) {
      // If single value, convert to array
      updateData.categories = Array.isArray(categories) ? categories : [categories];
    } else {
      // If no categories selected, set empty array
      updateData.categories = [];
    }

    // Handle sizes array
    if (sizes) {
      // Convert to numbers and handle single/multiple values
      const sizesArray = Array.isArray(sizes) ? sizes : [sizes];
      updateData.sizes = sizesArray.map(s => Number(s));
    } else {
      // If no sizes selected, set empty array
      updateData.sizes = [];
    }

    // If new images uploaded, replace existing images
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(
        (f) => "/uploads/products/" + f.filename
      );
    }

    await Product.findByIdAndUpdate(req.params.id, updateData);
    res.redirect("/admin?msg=updated");
  } catch (err) {
    console.error("Error editing product:", err);
    res.status(500).send("Server error updating product");
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
