// models/order.js - ENHANCED VERSION with Status History
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product",
                required: true
            },
            name: String,
            size: Number,
            price: Number,
            quantity: Number
        }
    ],

    shipping: {
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        address: String,
        city: String,
        zipCode: String,
        country: String
    },

    paymentMethod: {
        type: String,
        enum: ["bankTransfer", "cod"],
        required: true
    },

    screenshot: {
        type: String,
        default: null
    },

    subtotal: Number,
    shippingFee: Number,
    totalAmount: Number,

    orderStatus: {
        type: String,
        enum: ["pending", "processing", "confirmed", "shipped", "delivered", "cancelled"],
        default: "pending"
    },

    orderNumber: {
        type: String,
        unique: true
    },

    // NEW: Status History - Track when each status was set
    statusHistory: [
        {
            status: {
                type: String,
                enum: ["pending", "processing", "confirmed", "shipped", "delivered", "cancelled"]
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            note: String  // Optional admin note
        }
    ],

    // NEW: Tracking Information (for future integration with shipping carriers)
    tracking: {
        carrier: String,           // e.g., "TCS", "Leopards", "DHL"
        trackingNumber: String,    // Courier tracking number
        estimatedDelivery: Date,   // Expected delivery date
        actualDelivery: Date       // Actual delivery date
    },

    // NEW: Admin Notes
    adminNotes: String,

    // NEW: Customer Notes
    customerNotes: String
},
{ timestamps: true });

// Auto-generate order number
orderSchema.pre("save", function (next) {
    if (!this.orderNumber) {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.orderNumber = `Vi-${Date.now()}-${random}`;
    }
    next();
});

// Middleware to track status changes
orderSchema.pre("save", function (next) {
    // If orderStatus changed, add to history
    if (this.isModified('orderStatus')) {
        this.statusHistory.push({
            status: this.orderStatus,
            timestamp: new Date()
        });
    }
    next();
});

// Virtual to get days since order
orderSchema.virtual('daysSinceOrder').get(function() {
    const now = new Date();
    const orderDate = this.createdAt;
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual to check if order is overdue (more than 7 days in processing)
orderSchema.virtual('isOverdue').get(function() {
    if (this.orderStatus === 'processing' && this.daysSinceOrder > 7) {
        return true;
    }
    return false;
});

// Method to get status update date
orderSchema.methods.getStatusDate = function(status) {
    const history = this.statusHistory.find(h => h.status === status);
    return history ? history.timestamp : null;
};

// Static method to get orders by status with date range
orderSchema.statics.getOrdersByStatus = function(status, startDate, endDate) {
    let query = { orderStatus: status };
    
    if (startDate && endDate) {
        query.createdAt = {
            $gte: startDate,
            $lte: endDate
        };
    }
    
    return this.find(query).sort({ createdAt: -1 });
};

// Static method to get revenue statistics
orderSchema.statics.getRevenueStats = async function() {
    const stats = await this.aggregate([
        {
            $match: { orderStatus: { $in: ['delivered'] } }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$totalAmount' },
                totalOrders: { $sum: 1 },
                averageOrderValue: { $avg: '$totalAmount' }
            }
        }
    ]);
    
    return stats[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
};

module.exports = mongoose.model("order", orderSchema);

/* 
USAGE EXAMPLES:

1. Create Order with Initial Status:
   const order = new Order({
       user: userId,
       items: [...],
       orderStatus: 'pending'
   });
   await order.save();
   // statusHistory will automatically include 'pending' with timestamp

2. Update Status:
   const order = await Order.findById(orderId);
   order.orderStatus = 'shipped';
   await order.save();
   // statusHistory will automatically add 'shipped' with timestamp

3. Get Status Change Date:
   const shippedDate = order.getStatusDate('shipped');
   console.log('Order was shipped on:', shippedDate);

4. Check if Order is Overdue:
   if (order.isOverdue) {
       console.log('This order has been processing for over 7 days!');
   }

5. Get Orders by Status with Date Range:
   const startDate = new Date('2025-01-01');
   const endDate = new Date('2025-01-31');
   const januaryShipped = await Order.getOrdersByStatus('shipped', startDate, endDate);

6. Get Revenue Statistics:
   const stats = await Order.getRevenueStats();
   console.log('Total Revenue:', stats.totalRevenue);
   console.log('Average Order Value:', stats.averageOrderValue);
*/