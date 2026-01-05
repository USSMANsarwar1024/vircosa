const mongoose = require("mongoose");
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error: ', err));

const userSchema = new mongoose.Schema(
    {
        firstname: {
            type: String,
            trim: true,
        },
        lastname: {
            type: String,
            trim: true,
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
            includeBox: { type: Boolean, default: false },
            boxPrice: { type: Number, default: 0 },
        }],

        profilePicture: {
            type: String,
            trim: true,
            // default image 
            default: '/images/user-default-img.svg',
        },

        isVerified: {
            type: Boolean,
            default: false
        },
        otp: String,
        otpExpires: Date,
        lastOtpSent: Number,

        role: {
            type: String,
            enum: ["user", "23e@sKsH"],
            default: "user"
        }

    },
    { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);
