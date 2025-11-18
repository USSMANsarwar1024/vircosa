const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    orderStatus: {
        type: String,
        enum: ["processing", "delivered", "cancelled"],
        default: "pending",
    },
    orderNumber: {
        type: String,
        unique: true
    },

}, { timestamps: true });

module.exports = mongoose.model("order", orderSchema);
