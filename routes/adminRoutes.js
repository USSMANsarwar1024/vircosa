const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const multer = require("multer");
const path = require("path");

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/"); // local folder where images will be saved
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // e.g., 1698934739-12345.png
  },
});

// File filter (optional but good practice)
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/avif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid file type. Only images are allowed."), false);
};

// Initialize upload middleware
const upload = multer({ storage, fileFilter })

// Render admin dashboard (list all products)
router.get("/", async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.render("admin", { products });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading admin panel");
    }
});

// Add new product
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { name, description, category, price, productBadge } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    await Product.create({
      name,
      description,
      category,
      price,
      images: [imagePath],
      productBadge,
    });

    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding product");
  }
});



// Delete product
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
