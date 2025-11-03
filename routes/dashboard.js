const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const userModel = require("../models/user"); 

router.get("/dashboard", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email });
  res.render("dashboard", { user });
});

router.get('/cart', isLoggedIn, (req, res) => {
  res.render("cart");
})

router.get('/orders', (req, res) => {

})



module.exports = router;