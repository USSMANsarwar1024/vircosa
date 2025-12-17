const express = require("express");
const router = express.Router();
const Product = require("../models/product"); 
const Order = require("../models/order"); 
const multer = require("multer");
const path = require("path");
const User = require("../models/user");
const bcrypt = require("bcrypt");

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
// 23e@sKsH Dashboard
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

    res.render("23e@sKsH", {
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
      req,
    });
  } catch (err) {
    console.error("Error loading 23e@sKsH panel:", err);
    if (!res.headersSent) res.status(500).send("Server error loading 23e@sKsH panel");
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
      productBadge,
      shippingFee = 0,
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
      return res.redirect("/23e@sKsH-hajimemashite?msg=no-image");
    }

    const newProduct = new Product({
      name,
      description,
      images,
      productBadge,
      shippingFee: Number(shippingFee || 0),
      sku,
      categories,
      sizes,
      lasting,
      concentration,
      variants,
    });

    await newProduct.save();

    res.redirect("/23e@sKsH-hajimemashite?msg=added");
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
      // price, // REMOVED: Handled by variants
      productBadge,
      shippingFee = 0,
      // stock = 0, // REMOVED: Handled by variants
      sku,
      lasting,
      concentration,
      // sizes // REMOVED: Handled by variants
    } = req.body;

    // Variant handling
    let sizes = req.body.sizes || [];
    let prices = req.body.prices || [];
    let variantStock = req.body.variantStock || [];

    if (!Array.isArray(sizes)) sizes = [sizes];
    if (!Array.isArray(prices)) prices = [prices];
    if (!Array.isArray(variantStock)) variantStock = [variantStock];

    const variants = sizes.map((s, i) => ({
      size: Number(s),
      price: Number(prices[i] || 0),
      stock: Number(variantStock[i] || 0),
    }));

    // Calculate total stock for legacy fields/display (optional, but good practice)
    const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

    const updateData = {
      name,
      description,
      stock: totalStock, // Setting the combined stock
      variants: variants,
      productBadge: productBadge || undefined,
      shippingFee: Number(shippingFee || 0),
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

    // If new images uploaded, replace existing images
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(
        (f) => "/uploads/products/" + f.filename
      );
    }

    await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.redirect("/23e@sKsH-hajimemashite?msg=updated");
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
    res.redirect("/23e@sKsH-hajimemashite?msg=deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting product");
  }
});

// ============================
// 🧑‍💻 Customers Management
// ============================

// ============================
// 👥 View/List Customers with Enhanced Stats
// ============================
router.get("/customers", async (req, res) => {
  try {
    const perPage = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * perPage;

    // Build filter query
    let filterQuery = {};
    
    if (req.query.role) {
      filterQuery.role = req.query.role;
    }
    
    if (req.query.verified) {
      filterQuery.isVerified = req.query.verified === 'true';
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filterQuery.$or = [
        { firstname: searchRegex },
        { lastname: searchRegex },
        { email: searchRegex }
      ];
    }

    // Fetch customers with sorting
    const customers = await User.find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    const totalCustomers = await User.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalCustomers / perPage);

    // Calculate additional stats
    const stats = {
      total: await User.countDocuments(),
      verified: await User.countDocuments({ isVerified: true }),
      admins: await User.countDocuments({ role: '23e@sKsH' }),
      thisMonth: await User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    };

    res.render("23e@sKsH-customers", {
      customers,
      stats,
      pagination: {
        currentPage: page,
        totalPages,
        totalCustomers
      },
      filters: {
        role: req.query.role || '',
        verified: req.query.verified || '',
        search: req.query.search || ''
      },
      msg: req.query.msg,
      req
    });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).send("Server error fetching customers");
  }
});

// ============================
// ➕ Add New Customer with Validation
// ============================
router.post("/customers/add", async (req, res) => {
  try {
    const { 
      firstname, 
      lastname, 
      gender, 
      email, 
      password, 
      phone, 
      address, 
      role 
    } = req.body;

    // Validation: Check if required fields are present
    if (!firstname || !lastname || !email || !password) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=missing_fields");
    }

    // Validation: Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=invalid_email");
    }

    // Validation: Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=email_exists");
    }

    // Validation: Password length
    if (password.length < 8) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=password_short");
    }

    // Hash password before saving
    const hash = await bcrypt.hash(password, 12);

    const newUser = new User({ 
      firstname: firstname.trim(), 
      lastname: lastname.trim(), 
      gender, 
      email: email.toLowerCase().trim(), 
      password: hash, 
      phone: phone?.trim() || '', 
      address: address?.trim() || '', 
      isVerified: true, // Auto-verify admin-added users
      role: role || "user"
    });
    
    await newUser.save();
    
    res.redirect("/23e@sKsH-hajimemashite/customers?msg=customer_added");
  } catch (err) {
    console.error("Error adding customer:", err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=email_exists");
    }
    
    res.redirect("/23e@sKsH-hajimemashite/customers?msg=error_adding");
  }
});

// ============================
// ✏️ Edit Customer with Enhanced Features
// ============================
router.post("/customers/edit/:id", async (req, res) => {
  try {
    const { 
      firstname, 
      lastname, 
      gender, 
      email, 
      password, 
      phone, 
      address, 
      role, 
      isVerified 
    } = req.body;

    // Validation: Check if required fields are present
    if (!firstname || !lastname || !email) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=missing_fields");
    }

    // Check if customer exists
    const existingCustomer = await User.findById(req.params.id);
    if (!existingCustomer) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=customer_not_found");
    }

    // Check if email is being changed and if new email already exists
    if (email.toLowerCase() !== existingCustomer.email.toLowerCase()) {
      const emailExists = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      
      if (emailExists) {
        return res.redirect("/23e@sKsH-hajimemashite/customers?msg=email_exists");
      }
    }

    const updateData = { 
      firstname: firstname.trim(), 
      lastname: lastname.trim(), 
      gender, 
      email: email.toLowerCase().trim(), 
      phone: phone?.trim() || '', 
      address: address?.trim() || '',
      role: role || "user",
      isVerified: isVerified === 'on'
    };
    
    // Only update password if a new one is provided
    if (password && password.trim() !== '') {
      if (password.length < 8) {
        return res.redirect("/23e@sKsH-hajimemashite/customers?msg=password_short");
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    await User.findByIdAndUpdate(req.params.id, updateData, { 
      new: true,
      runValidators: true 
    });
    
    res.redirect("/23e@sKsH-hajimemashite/customers?msg=customer_updated");
  } catch (err) {
    console.error("Error editing customer:", err);
    
    if (err.code === 11000) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=email_exists");
    }
    
    res.redirect("/23e@sKsH-hajimemashite/customers?msg=error_updating");
  }
});

// ============================
// 🗑️ Delete Customer with Safety Checks
// ============================
router.post("/customers/delete/:id", async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    
    if (!customer) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=customer_not_found");
    }

    // Optional: Prevent deleting the last admin
    if (customer.role === '23e@sKsH') {
      const adminCount = await User.countDocuments({ role: '23e@sKsH' });
      if (adminCount <= 1) {
        return res.redirect("/23e@sKsH-hajimemashite/customers?msg=cannot_delete_last_admin");
      }
    }

    await User.findByIdAndDelete(req.params.id);
    
    res.redirect("/23e@sKsH-hajimemashite/customers?msg=customer_deleted");
  } catch (err) {
    console.error("Error deleting customer:", err);
    res.redirect("/23e@sKsH-hajimemashite/customers?msg=error_deleting");
  }
});

// ============================
// 📊 Get Customer Details (API Endpoint)
// ============================
router.get("/customers/:id", async (req, res) => {
  try {
    const customer = await User.findById(req.params.id)
      .select('-password')
      .lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get customer's order statistics
    const orderStats = await Order.aggregate([
      { $match: { userId: customer._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    customer.stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      completedOrders: 0
    };

    res.json(customer);
  } catch (err) {
    console.error("Error fetching customer details:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================
// 📧 Bulk Operations: Send Verification Emails
// ============================
router.post("/customers/bulk/verify", async (req, res) => {
  try {
    const { customerIds } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=no_customers_selected");
    }

    await User.updateMany(
      { _id: { $in: customerIds } },
      { $set: { isVerified: true } }
    );

    res.redirect("/23e@sKsH-hajimemashite/customers?msg=bulk_verified");
  } catch (err) {
    console.error("Error in bulk verification:", err);
    res.redirect("/23e@sKsH-hajimemashite/customers?msg=error_bulk_verify");
  }
});

// ============================
// 🔒 Bulk Operations: Deactivate Accounts
// ============================
router.post("/customers/bulk/deactivate", async (req, res) => {
  try {
    const { customerIds } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.redirect("/23e@sKsH-hajimemashite/customers?msg=no_customers_selected");
    }

    await User.updateMany(
      { _id: { $in: customerIds } },
      { $set: { isVerified: false } }
    );

    res.redirect("/23e@sKsH-hajimemashite/customers?msg=bulk_deactivated");
  } catch (err) {
    console.error("Error in bulk deactivation:", err);
    res.redirect("/23e@sKsH-hajimemashite/customers?msg=error_bulk_deactivate");
  }
});

// ============================
// 📤 Export Customers to CSV
// ============================
router.get("/customers/export/csv", async (req, res) => {
  try {
    const customers = await User.find()
      .select('-password')
      .lean();

    // Create CSV header
    let csv = 'ID,First Name,Last Name,Email,Phone,Role,Verified,Joined Date\n';

    // Add customer data
    customers.forEach(customer => {
      csv += `"${customer._id}","${customer.firstname}","${customer.lastname}","${customer.email}","${customer.phone || 'N/A'}","${customer.role}","${customer.isVerified}","${new Date(customer.createdAt).toLocaleDateString()}"\n`;
    });

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=customers-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("Error exporting customers:", err);
    res.status(500).send("Error exporting customers");
  }
});

// ============================
// 🔍 Search Customers (API Endpoint)
// ============================
router.get("/api/customers/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const searchRegex = new RegExp(q, 'i');
    
    const customers = await User.find({
      $or: [
        { firstname: searchRegex },
        { lastname: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
    })
    .select('firstname lastname email phone role isVerified')
    .limit(10)
    .lean();

    res.json(customers);
  } catch (err) {
    console.error("Error searching customers:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================
// 📊 Analytics Dashboard (NEW SECTION)
// ============================
router.get("/analytics", async (req, res) => {
  try {
    // 1. Total Revenue, Total Orders, Total Users (for headline stats)
    const [totalRevenueResult, totalOrders, totalUsers] = await Promise.all([
      Order.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]),
      Order.countDocuments(),
      User.countDocuments(),
    ]);

    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

    // 2. Revenue Over Last 7 Days (for line chart)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const revenueByDay = await Order.aggregate([
      { 
        $match: {
          status: "completed",
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          dailyRevenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    
    // Prepare data for Chart.js (filling in zero for days with no sales)
    const chartData = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(sevenDaysAgo.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        const dataPoint = revenueByDay.find(d => d._id === dateString);
        chartData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: dataPoint ? dataPoint.dailyRevenue : 0
        });
    }


    // 3. Top 5 Selling Products (for bar/pie chart)
    const topProducts = await Order.aggregate([
      { $match: { status: "completed" } },
      { $unwind: "$products" }, // Deconstruct products array
      {
        $group: {
          _id: "$products.product._id",
          name: { $first: "$products.product.name" },
          totalQuantity: { $sum: "$products.quantity" }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);


    // 4. Product Stock Status (for simple list/alert)
    const lowStockThreshold = 10;
    const lowStockProducts = await Product.find({ stock: { $lte: lowStockThreshold } }).limit(5).lean();


    res.render("admin-analytics", {
      stats: {
        totalRevenue,
        totalOrders,
        totalUsers,
        // You can calculate more stats here if needed
      },
      chartData: chartData, // Revenue for the last 7 days
      topProducts: topProducts, // Top 5 sellers
      lowStockProducts: lowStockProducts, // Products below threshold
      req
    });

  } catch (err) {
    console.error("Error fetching analytics data:", err);
    res.status(500).send("Server error fetching analytics data");
  }
});

module.exports = router;
