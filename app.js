const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./src/config/db");
const session = require("express-session");
const passport = require("passport");
require("./src/config/passport");
const noCache = require("nocache");
const MongoStore = require("connect-mongo");

const cartCountMiddleware = require("./src/middleware/cartCount");

const userRoutes = require("./src/router/userRouter");
const adminRoutes = require("./src/router/adminRouter");
const authRoutes = require("./src/router/authRouter");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "yoursecurity",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(cartCountMiddleware);

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "src", "views", "user"),
  path.join(__dirname, "src", "views", "admin"),
]);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.admin = req.session.admin || null;
  next();
});

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, "public")));

app.use(noCache());

app.use("/admin", (req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use("/admin", adminRoutes);

app.use("/auth", authRoutes);

app.use("/", userRoutes);

app.use((req, res) => {
  res.status(404).render("404");
}); 

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
