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
        type: String, // File path from multer
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
    }
},
{ timestamps: true });

// Auto-generate order number (e.g: Vi-20250219-XYZ123)
orderSchema.pre("save", function (next) {
    if (!this.orderNumber) {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.orderNumber = `Vi-${Date.now()}-${random}`;
    }
    next();
});


module.exports = mongoose.model("order", orderSchema);
