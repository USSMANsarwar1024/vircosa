const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const userModel = require("../models/user"); 

router.get("/dashboard", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email });
  res.render("dashboard", { user });
});





module.exports = router;