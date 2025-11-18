const mongoose = require("mongoose");
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error: ', err));

const userSchema = new mongoose.Schema(
    {
        firstname: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
        },
        lastname: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
        },
        gender: {
            type: String,
            enum: ["m", "f", "o"], // male, female, other
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            match: [/^(\+92|92|0)?3\d{9}$/, "Please enter a valid Pakistani phone number"],
        },
        address: {
            type: String,
            trim: true,
        },
        wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "product" }],
        cart: [{
            product: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
            quantity: { type: Number, default: 1, min: 1 },
            size: { type: Number, required: true },
            price: { type: Number, required: true },
        }],

        profilePicture: {
            type: String,
            trim: true,
            // default image 
            default: '../public/images/user-default-img.svg',
        },

    },
    { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);
