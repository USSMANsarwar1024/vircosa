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
    category: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
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
    }

}, { timestamps: true });

module.exports = mongoose.model("product", productSchema);
