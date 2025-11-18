const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
    },
    description: {
        type: String,
        required: true
    },
    categories: {
        type: [String],
        required: true
    },
    images: {
        type: [String],
        validate: [(v) => v.length > 0, 'At least one image is required'],
        required: true
    }, // multiple product images but atleast one is necessary!
    productBadge: String,
    ratings: {
        average: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 },
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    lasting: {
        type: String,
        default: "8-10 Hours"
    },
    concentration: {
        type: Number,
        default: 40,
    },
    sku: {
        type: String,
        trim: true
    },

    variants: [
        {
            size: { type: Number, required: true },
            price: { type: Number, required: true },
            stock: { type: Number, default: 0},
        }
    ],



}, { timestamps: true });

module.exports = mongoose.model("product", productSchema);
