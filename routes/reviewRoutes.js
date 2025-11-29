const express = require("express");
const router = express.Router();
const Review = require("../models/review");
const Product = require("../models/product");
const { isLoggedIn } = require("../middleware/auth");

router.post("/add", isLoggedIn, async (req, res) => {
    try {
        const { productId, rating, title, comment } = req.body;

        const review = await Review.create({
            user: req.user._id,
            product: productId,
            rating,
            title,
            comment
        });

        // Recalculate product ratings
        const stats = await Review.aggregate([
            { $match: { product: review.product } },
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
                "ratings.average": stats[0].avgRating,
                "ratings.totalReviews": stats[0].total
            }
        });

        return res.json({ success: true, review });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
