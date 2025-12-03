const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    topic: String,
    message: String,
}, { timestamps: true });

module.exports = mongoose.model("contactMessage", contactSchema);
