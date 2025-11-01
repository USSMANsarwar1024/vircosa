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
    images: [{ 
        type: String
    }], // multiple product images
    ratings: {
        average: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 },
    },

}, { timestamps: true });

module.exports = mongoose.model("product", productSchema);
