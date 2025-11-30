// /routes/adminOrders.js
const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const sendEmail = require("../utils/sendEmail");

// ============================
// View All Orders (Admin Panel)
// ============================
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 15;
        const status = req.query.status || 'all';
        
        let query = {};
        if (status !== 'all') {
            query.orderStatus = status;
        }
        
        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
        .populate('user', 'firstname lastname email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);
        
        const totalPages = Math.ceil(totalOrders / perPage);
        
        // Count by status for filter badges
        const statusCounts = await Order.aggregate([
            { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
        ]);
        
        const counts = {
            all: totalOrders,
            pending: 0,
            processing: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };
        
        statusCounts.forEach(item => {
            counts[item._id] = item.count;
        });
        
        res.render("admin-orders", {
            orders,
            counts,
            currentStatus: status,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders
            }
        });
    } catch (err) {
        console.error("Error loading orders:", err);
        res.status(500).send("Server error loading orders");
    }
});

// ============================
// View Single Order Details (Admin)
// ============================
router.get("/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('user', 'firstname lastname email phone')
      .populate('items.product', 'name images');

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("admin-order-details", { order });
  } catch (err) {
    console.error("Error loading order details:", err);
    res.status(500).send("Server error");
  }
});

// ============================
// Update Order Status (Admin)
// ============================
router.post("/update-status/:orderId", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        const validStatuses = ["pending", "processing", "confirmed", "shipped", "delivered", "cancelled"];
        
    if (!validStatuses.includes(status)) {
      return res.json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(orderId).populate('user', 'firstname lastname email');
    
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    const oldStatus = order.orderStatus;
    order.orderStatus = status;
    await order.save();

    // Send email notification to customer
    const statusMessages = {
      pending: {
        subject: "Order Received - Awaiting Confirmation",
        message: "We have received your order and it's awaiting confirmation.",
        icon: "⏳"
      },
      processing: {
        subject: "Order is Being Processed",
        message: "Great news! Your order is now being processed by our team.",
        icon: "📦"
      },
      confirmed: {
        subject: "Order Confirmed - Ready to Ship",
        message: "Your order has been confirmed and will be shipped soon!",
        icon: "✅"
      },
      shipped: {
        subject: "Your Order Has Been Shipped!",
        message: "Exciting news! Your order is on its way to you.",
        icon: "🚚"
      },
      delivered: {
        subject: "Order Delivered Successfully",
        message: "Your order has been delivered. We hope you love your purchase!",
        icon: "🎉"
      },
      cancelled: {
        subject: "Order Cancelled",
        message: "Your order has been cancelled as requested.",
        icon: "❌"
      }
    };

    const statusInfo = statusMessages[status];

    try {
      await sendEmail({
        to: order.shipping.email,
        subject: `${statusInfo.icon} ${statusInfo.subject} - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #8B5A2B 0%, #4A2C2A 100%); border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 2.5rem;">${statusInfo.icon}</h1>
              <h2 style="color: white; margin: 10px 0 0 0;">Order Status Update</h2>
            </div>
            
            <div style="background: #f8f5f2; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 1.1rem; color: #2A2118;">Dear ${order.shipping.firstName},</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5A2B;">
                <p style="margin: 0; color: #2A2118; font-size: 1rem;">${statusInfo.message}</p>
              </div>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #8B5A2B; margin-top: 0;">Order Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Order Number:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #2A2118;">${order.orderNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Status:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #8B5A2B; text-transform: uppercase;">${status}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Total Amount:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #2A2118;">PKR ${order.totalAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Order Date:</td>
                    <td style="padding: 8px 0; color: #2A2118;">${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                </table>
              </div>

              ${status === 'shipped' ? `
                <div style="background: #d4f4dd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #155724;">
                    <strong>📍 Track Your Package:</strong><br>
                    Your order is on the way! You can track it anytime by logging into your account.
                  </p>
                </div>
              ` : ''}

              ${status === 'delivered' ? `
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #856404;">
                    <strong>💝 We'd Love Your Feedback!</strong><br>
                    How was your experience? Please consider leaving a review.
                  </p>
                </div>
              ` : ''}

              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.BASE_URL || 'http://localhost:3000'}/track-order" 
                   style="display: inline-block; padding: 12px 30px; background: #8B5A2B; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Track Order
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="color: #666; font-size: 0.9rem; text-align: center;">
                Questions? Contact us at <a href="mailto:support@vircosa.com" style="color: #8B5A2B;">support@vircosa.com</a>
              </p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error("Failed to send status update email:", emailErr);
    }

    return res.json({
      success: true,
      message: `Order status updated to ${status}`,
      newStatus: status
    });

  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.json({
      success: false,
      message: "Failed to update order status"
    });
  }
});


module.exports = router;