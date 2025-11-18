const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'product', 
        required: true 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user', 
        required: true 
    },
    rating: { 
        type: Number, 
        required: true, 
        min: 1, max: 5 
    },
    comment: { type: String, trim: true, maxlength: 500 },
    // Ensure one user can only review a product once
    unique: true,
}, { timestamps: true });

module.exports = mongoose.model("review", ReviewSchema);
