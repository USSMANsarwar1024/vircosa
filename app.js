const express = require("express");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const cookieParser = require("cookie-parser");
const session = require('express-session');
const flash = require('connect-flash');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const { isAdmin } = require("./middleware/auth");

const adminOrdersRouter = require('./routes/23e@sKsH-Orders');
const trackOrderRouter = require('./routes/trackOrder');


// --- Middleware ---
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware MUST come before flash
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback-secret', // Use env variable
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using HTTPS
}));

// Flash middleware MUST come after session
app.use(flash());

// Make flash messages accessible in all views - this should come AFTER flash middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.warning = req.flash('warning');
  next();
});

// Set `user` in locals when a valid JWT cookie exists (non-blocking)
app.use(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(data.userId).select('-password');

    if (user) {
      req.user = user;           // ✅ BACKEND
      res.locals.user = user;    // ✅ FRONTEND
    }
  } catch (err) {
    // silently ignore invalid token
  }

  next();
});


// --- Route Registration ---
// Import route files
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const productRoutes = require("./routes/productRoutes");
const a23esKsH_hajimemashite = require("./routes/23e@sKsH");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const googleAuthRoutes = require("./routes/authGoogle");
const reviewRoutes = require("./routes/reviewRoutes");

const ADMIN_PATH = "/23e@sKsH-hajimemashite";

// Mount routes AFTER all middleware
app.use("/", indexRoutes);
app.use("/", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/products", productRoutes);
// app.use("/23e@sKsH-hajimemashite", a23esKsH_hajimemashite);
app.use(ADMIN_PATH, isAdmin, a23esKsH_hajimemashite);
app.use("/cart", cartRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/auth", googleAuthRoutes);
app.use("/reviews", reviewRoutes);

app.use('/23e@sKsH-hajimemashite/orders', adminOrdersRouter);  // Admin order management
app.use('/track-order', trackOrderRouter);     // Public tracking


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});