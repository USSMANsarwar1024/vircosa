const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const userModel = require("../models/user"); 

router.get("/dashboard", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ email: req.user.email });
  res.render("dashboard", { user });
});





router.get('/orders', (req, res) => {

})



module.exports = router;