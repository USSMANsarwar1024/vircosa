// /routes/dashboard.js
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const userModel = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Review = require('../models/review');
const BASE_SHIPPING = 300;
const transporter = require("../config/mailer");

function calculateShipping(paymentMethod) {
  if (paymentMethod === 'bankTransfer') {
    return BASE_SHIPPING / 2; // 50% discount for bank transfer
  }
  return BASE_SHIPPING; // COD
}

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../public/uploads/vouchers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voucher-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  }
});

// Dashboard Route
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    const featuredProducts = await Product.find()
      .limit(8)
      .sort({ createdAt: -1 })
      .lean();

    

    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).lean();

    const myReviews = await Review.find({ user: req.user._id }).populate("product", "name images");

    // Count total orders
    const totalOrders = orders.length;

    res.render("dashboard", {
      user,
      featuredProducts,
      orders,
      totalOrders,
      myReviews,
      req,
    });
  } catch (error) {
    const user = await userModel.findOne({ email: req.user.email });
    res.render("dashboard", {
      user,
      featuredProducts: [],

    });
  }
});

// Checkout Route
router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).populate("cart.product");

    if (!user.cart || user.cart.length === 0) {
      return res.redirect("/cart");
    }

    const subtotal = user.cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const shipping = BASE_SHIPPING;
    const total = subtotal + shipping;

    res.render("checkout", {
      user,
      cartItems: user.cart,
      subtotal,
      shipping,
      total,
      req
    });

  } catch (error) {
    console.error("Error loading checkout:", error);
    res.redirect("/cart");
  }
});


// Orders Route - View all orders
router.get("/orders", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const orders = await Order.find({ user: user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.render("orders", { user, orders });
  } catch (error) {
    console.error("Error loading orders:", error);
    res.render("orders", { user: req.user, orders: [] });
  }
});

// Create Order Route
router.post('/orders', isLoggedIn, upload.single('screenshot'), async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user._id)
      .populate("cart.product");

    if (!user.cart || user.cart.length === 0) {
      return res.json({ success: false, message: "Your cart is empty." });
    }

    const { paymentMethod } = req.body;

    if (!['bankTransfer', 'cod'].includes(paymentMethod)) {
      return res.json({ success: false, message: "Invalid payment method." });
    }

    if (paymentMethod === 'bankTransfer' && !req.file) {
      return res.json({
        success: false,
        message: "Payment screenshot is required for bank transfer."
      });
    }

    // 🔒 Recalculate subtotal + validate stock again
    let subtotal = 0;

    for (const item of user.cart) {
      const variant = item.product.variants.find(
        v => v.size === item.size
      );

      if (!variant || variant.stock < item.quantity) {
        return res.json({
          success: false,
          message: `Stock issue with ${item.product.name} (${item.size}ml)`
        });
      }

      subtotal += item.price * item.quantity;
    }

    const shippingFee = calculateShipping(paymentMethod);
    const totalAmount = subtotal + shippingFee;

    const screenshotPath = req.file
      ? `/uploads/vouchers/${req.file.filename}`
      : null;

    const shipping = JSON.parse(req.body.shipping);

    const newOrder = new Order({
      user: user._id,
      items: user.cart.map(item => ({
        product: item.product._id,
        name: item.product.name,
        size: item.size,
        price: item.price,
        quantity: item.quantity
      })),
      shipping,
      paymentMethod,
      screenshot: screenshotPath,
      subtotal,
      shippingFee,
      totalAmount,
      orderStatus: "pending"
    });

    await newOrder.save();

     // 🔻 Reduce stock
    for (const item of user.cart) {
      const product = await Product.findById(item.product._id);
      const variant = product.variants.find(v => v.size === item.size);
      variant.stock -= item.quantity;
      await product.save();
    }

    // 🧹 Clear cart
    user.cart = [];
    await user.save();


    // Send emails
    try {
      await transporter.sendMail({
        to: `${process.env.MAIL_USER}`,
        bcc: "ceo@vircosa.com",
        subject: `New Order Received - ${newOrder.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5A2B;">🎉 New Order Placed</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p><strong>Order Number:</strong> ${newOrder.orderNumber}</p>
              <p><strong>Customer:</strong> ${user.firstname} ${user.lastname}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Phone:</strong> ${shipping.phone}</p>
              <p><strong>Total Amount:</strong> PKR ${totalAmount.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod === 'bankTransfer' ? 'Bank Transfer' : 'Cash on Delivery'}</p>
            </div>
            ${screenshotPath ? `<p><strong>Payment Screenshot:</strong> <a href="${process.env.BASE_URL || 'http://localhost:3000'}${screenshotPath}" style="color: #8B5A2B;">View Screenshot</a></p>` : ''}
            <hr style="border: 1px solid #ddd; margin: 20px 0;">
            <h3 style="color: #8B5A2B;">📦 Order Items:</h3>
            ${newOrder.items.map(item => `
              <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <p><strong>${item.name}</strong> (${item.size}ml) × ${item.quantity}</p>
                <p>PKR ${item.price.toFixed(2)}</p>
              </div>
            `).join('')}
            <hr style="border: 1px solid #ddd; margin: 20px 0;">
            <h3 style="color: #8B5A2B;">🚚 Shipping Address:</h3>
            <p>${shipping.address}<br>${shipping.city}, ${shipping.zipCode}<br>${shipping.country}</p>
          </div>
        `
      });

      await transporter.sendMail({
        to: shipping.email,
        subject: "Your Vircosa Order Confirmation",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5A2B;">Thank you for your order! 🎉</h2>
            <p>Dear ${shipping.firstName},</p>
            <p>Your order has been successfully placed.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p><strong>Order Number:</strong> ${newOrder.orderNumber}</p>
              <p><strong>Total Amount:</strong> PKR ${totalAmount.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod === 'bankTransfer' ? 'Bank Transfer' : 'Cash on Delivery'}</p>
              <p><strong>Status:</strong> Pending</p>
            </div>
            ${paymentMethod === 'bankTransfer' ?
            '<p style="background: #fff3cd; padding: 15px; border-radius: 8px;">⏳ We will verify your payment shortly and update your order status.</p>'
            : ''}
            <p>You can track your order in your dashboard.</p>
            <br>
            <p style="color: #8B5A2B; font-weight: bold;">Thank you for shopping with Vircosa! ✨</p>
          </div>
        `
      });

        return res.json({
        success: true,
        orderNumber: newOrder.orderNumber,
        message: "Order placed successfully!"
      });

    } catch (emailErr) {
      console.error("Failed to send emails:", emailErr);
    }

    user.cart = [];
    await user.save();

    return res.json({
      success: true,
      orderNumber: newOrder.orderNumber,
      message: "Order placed successfully!"
    });

  } catch (err) {
    console.error("ORDER ERROR:", err);
    return res.json({
      success: false,
      message: err.message || "Server error while creating order."
    });
  }
});

// Cancel Order Route
router.post('/orders/:orderId/cancel', isLoggedIn, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      return res.json({ success: false, message: "Order not found." });
    }

    if (order.orderStatus !== 'pending') {
      return res.json({
        success: false,
        message: `Cannot cancel order. Current status: ${order.orderStatus}`
      });
    }

    order.orderStatus = 'cancelled';
    await order.save();

    // Send cancellation email to user
    try {
      await transporter.sendMail({
        to: order.shipping.email,
        subject: "Order Cancellation Confirmation",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5A2B;">Order Cancelled</h2>
            <p>Dear ${order.shipping.firstName},</p>
            <p>Your order <strong>${order.orderNumber}</strong> has been successfully cancelled.</p>
            <div style="background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Total Amount:</strong> PKR ${order.totalAmount.toFixed(2)}</p>
              <p><strong>Status:</strong> Cancelled</p>
            </div>
            ${order.paymentMethod === 'bankTransfer' ?
            '<p>If payment was already made, refund will be processed within 5-7 business days.</p>' :
            '<p>No payment was processed as you selected Cash on Delivery.</p>'
          }
            <p>We hope to serve you again soon! ✨</p>
          </div>
        `
      });

      // Notify admin
      await sendEmail({
        to: "usmansarwar4028@gmail.com",
        subject: `Order Cancelled - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #721C24;">⚠️ Order Cancelled</h2>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Customer:</strong> ${order.shipping.firstName} ${order.shipping.lastName}</p>
            <p><strong>Email:</strong> ${order.shipping.email}</p>
            <p><strong>Total Amount:</strong> PKR ${order.totalAmount.toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod === 'bankTransfer' ? 'Bank Transfer' : 'Cash on Delivery'}</p>
            ${order.paymentMethod === 'bankTransfer' ? '<p style="background: #fff3cd; padding: 10px;">⚠️ Customer paid via bank transfer - Refund may be required.</p>' : ''}
          </div>
        `
      });
    } catch (emailErr) {
      console.error("Failed to send cancellation emails:", emailErr);
    }

    return res.json({
      success: true,
      message: "Order cancelled successfully!"
    });

  } catch (err) {
    console.error("CANCEL ORDER ERROR:", err);
    return res.json({
      success: false,
      message: "Failed to cancel order."
    });
  }
});

module.exports = router;

// 🔥 Pro Tips for Dashboard
// 1. Personalized Products
// Show products based on user's browsing history:
// javascript// In your route
// const userHistory = user.viewedCategories || ['women', 'unisex'];
// const featuredProducts = await Product.find({
//   categories: { $in: userHistory }
// }).limit(8).lean();
// 2. Different Section Title
// Customize the title for dashboard:
// html<!-- In perfumes-section.ejs, change: -->
// <h2 class="section-title brand-font">Recommended For You</h2>
// <!-- or -->
// <h2 class="section-title brand-font">You Might Like</h2>
// 3. Show User-Specific Badge
// html<% if (product.categories.includes('women') && user.gender === 'female') { %>
//   <span class="badge-sale">RECOMMENDED</span>
// <% } %>


// // OPTION 1: Get Latest Products (Newest First)
// const featuredProducts = await Product.find()
//   .limit(8)
//   .sort({ createdAt: -1 })
//   .lean();

// // OPTION 2: Get Random Products (Different each time)
// const featuredProducts = await Product.aggregate([
//   { $sample: { size: 8 } }
// ]);

// // OPTION 3: Get Products with Badges (Sale, New, Bestseller)
// const featuredProducts = await Product.find({
//   productBadge: { $in: ['New', 'Bestseller', 'Sale'] }
// })
//   .limit(8)
//   .sort({ createdAt: -1 })
//   .lean();

// // OPTION 4: Get Bestsellers Only
// const featuredProducts = await Product.find({
//   productBadge: 'Bestseller'
// })
//   .limit(8)
//   .lean();

// // OPTION 5: Get Products from Specific Categories
// const featuredProducts = await Product.find({
//   categories: { $in: ['women', 'unisex', 'new'] }
// })
//   .limit(8)
//   .sort({ createdAt: -1 })
//   .lean();

// // OPTION 6: Get In-Stock Products Only
// const featuredProducts = await Product.find({
//   'variants': {
//     $elemMatch: { stock: { $gt: 0 } }
//   }
// })
//   .limit(8)
//   .sort({ createdAt: -1 })
//   .lean();

// // OPTION 7: Get Products Sorted by Price (Low to High)
// const featuredProducts = await Product.find()
//   .limit(8)
//   .sort({ 'variants.0.price': 1 })
//   .lean();

// // OPTION 8: Get Products Sorted by Price (High to Low)
// const featuredProducts = await Product.find()
//   .limit(8)
//   .sort({ 'variants.0.price': -1 })
//   .lean();

// // OPTION 9: Mix of Categories (More diverse)
// const featuredProducts = await Product.aggregate([
//   {
//     $match: {
//       categories: { $in: ['women', 'men', 'unisex'] }
//     }
//   },
//   { $sample: { size: 8 } }
// ]);

// // OPTION 10: Personalized Based on User Preferences (Advanced)
// // Get user's favorite categories from their order history or wishlist
// const userPreferences = user.preferences || ['women', 'unisex'];
// const featuredProducts = await Product.find({
//   categories: { $in: userPreferences }
// })
//   .limit(8)
//   .sort({ createdAt: -1 })
//   .lean();

// // OPTION 11: Get Top Rated Products (If you have ratings)
// const featuredProducts = await Product.find()
//   .limit(8)
//   .sort({ 'ratings.average': -1, 'ratings.totalReviews': -1 })
//   .lean();

// // OPTION 12: Seasonal/Promotional Products
// const featuredProducts = await Product.find({
//   $or: [
//     { productBadge: 'Sale' },
//     { productBadge: 'New' },
//     { categories: 'seasonal' }
//   ]
// })
//   .limit(8)
//   .sort({ createdAt: -1 })
//   .lean();