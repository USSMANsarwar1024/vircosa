const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth"); // Import the middleware

router.get("/dashboard", isLoggedIn, (req, res) => {
  res.render("dashboard");
});

module.exports = router;