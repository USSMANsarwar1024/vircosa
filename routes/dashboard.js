const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const userModel = require("../models/user"); 

const findUser = async (req) => {
  const user = await userModel.findOne({ email: req.user.email });
  return user;
};


router.get("/dashboard", isLoggedIn, async (req, res) => {
  let user = findUser;
  res.render("dashboard", { user });
});





router.get('/orders', (req, res) => {

})



module.exports = router;