const express = require("express");
const router = express.Router();

const Review = require("../models/review");
const Product = require("../models/product");

// POST /reviews/add
router.post("/add", async (req, res) => {
    try {
        const { productId, rating, title, comment } = req.body;

        const review = await Review.create({
            user: req.user?._id, // make sure user is logged in
            product: productId,
            rating,
            title,
            comment
        });

        // Recalculate product ratings
        const stats = await Review.aggregate([
            { $match: { product: productId } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$rating" },
                    total: { $sum: 1 }
                }
            }
        ]);

        await Product.findByIdAndUpdate(productId, {
            $set: {
                "ratings.average": stats[0]?.avgRating || 0,
                "ratings.totalReviews": stats[0]?.total || 0
            }
        });

        return res.json({ success: true, review });
    } catch (err) {
        console.log("Error adding review:", err);
        return res.json({ success: false, message: "Server error" });
    }
});

module.exports = router;
