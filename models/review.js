const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "user", 
        required: true 
    },
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "product", 
        required: true 
    },
    order: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "order" 
    },

    rating: { 
        type: Number, 
        min: 1, 
        max: 5, 
        required: true 
    },
    title: { 
        type: String, 
        trim: true 
    },
    comment: { 
        type: String, 
        trim: true, 
        required: true 
    },

}, { timestamps: true });

module.exports = mongoose.model("review", reviewSchema);
