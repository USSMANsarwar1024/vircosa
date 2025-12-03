// /routes/trackOrder.js
const express = require("express");
const router = express.Router();
const Order = require("../models/order");

// ============================
// Track Order Page (Public)
// ============================
router.get("/", (req, res) => {
  res.render("track-order", { 
    order: null,
    req,
  });
});

// ============================
// Search Order by Order Number
// ============================
router.post("/search", async (req, res) => {
  try {
    const { orderNumber, email } = req.body;

    if (!orderNumber || !email) {
      return res.json({
        success: false,
        message: "Please provide both order number and email"
      });
    }

    // Find order by order number and email
    const order = await Order.findOne({
      orderNumber: orderNumber.trim(),
      'shipping.email': email.trim().toLowerCase()
    }).populate('items.product', 'name images');

    if (!order) {
      return res.json({
        success: false,
        message: "Order not found. Please check your order number and email address."
      });
    }

    // Calculate progress percentage
    const statusProgress = {
      pending: 20,
      processing: 40,
      confirmed: 60,
      shipped: 80,
      delivered: 100,
      cancelled: 0
    };

    const progress = statusProgress[order.orderStatus] || 0;

    // Format order data
    const orderData = {
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      status: order.orderStatus,
      progress: progress,
      customer: {
        name: `${order.shipping.firstName} ${order.shipping.lastName}`,
        email: order.shipping.email,
        phone: order.shipping.phone
      },
      shipping: {
        address: order.shipping.address,
        city: order.shipping.city,
        zipCode: order.shipping.zipCode,
        country: order.shipping.country
      },
      items: order.items.map(item => ({
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        image: item.product?.images?.[0] || '/uploads/products/placeholder.jpg'
      })),
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod === 'bankTransfer' ? 'Bank Transfer' : 'Cash on Delivery',
      // Timeline events
      timeline: generateTimeline(order)
    };

    return res.json({
      success: true,
      order: orderData
    });

  } catch (err) {
    console.error("TRACK ORDER ERROR:", err);
    return res.json({
      success: false,
      message: "An error occurred while tracking your order. Please try again."
    });
  }
});

// Helper function to generate timeline
function generateTimeline(order) {
  const timeline = [];
  
  const statusOrder = ['pending', 'processing', 'confirmed', 'shipped', 'delivered'];
  const currentStatusIndex = statusOrder.indexOf(order.orderStatus);
  
  const statusInfo = {
    pending: {
      title: 'Order Placed',
      icon: 'fas fa-check-circle',
      description: 'We have received your order'
    },
    processing: {
      title: 'Processing',
      icon: 'fas fa-box',
      description: 'Your order is being prepared'
    },
    confirmed: {
      title: 'Confirmed',
      icon: 'fas fa-clipboard-check',
      description: 'Order confirmed and ready to ship'
    },
    shipped: {
      title: 'Shipped',
      icon: 'fas fa-shipping-fast',
      description: 'Your order is on the way'
    },
    delivered: {
      title: 'Delivered',
      icon: 'fas fa-home',
      description: 'Order successfully delivered'
    }
  };

  statusOrder.forEach((status, index) => {
    let state = 'pending'; // Default state
    
    if (order.orderStatus === 'cancelled') {
      state = 'pending';
    } else if (index < currentStatusIndex) {
      state = 'completed';
    } else if (index === currentStatusIndex) {
      state = 'active';
    }

    timeline.push({
      status: status,
      title: statusInfo[status].title,
      icon: statusInfo[status].icon,
      description: statusInfo[status].description,
      state: state,
      date: state === 'completed' || state === 'active' ? order.createdAt : null
    });
  });

  return timeline;
}

module.exports = router;