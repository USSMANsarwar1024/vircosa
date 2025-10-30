const express = require("express");
const app = express();
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const cookieParser = require("cookie-parser");

// Import route files
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");

// --- Middleware ---
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Route Registration ---
app.use("/", indexRoutes);
app.use("/", authRoutes); 
app.use("/", dashboardRoutes); 

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
