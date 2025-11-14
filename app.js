const express = require("express");
const app = express();
const path = require("path");
const connectDB=require('./src/config/db')
const dotenv = require('dotenv');
dotenv.config();
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
require("./src/config/passport");
const noCache = require("nocache")

// Import Routes
const userRoutes = require("./src/router/userRouter");
const adminRoutes = require("./src/router/adminRouter");
const authRoutes = require("./src/router/authRouter")

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "yoursecurity",
        resave:false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            ttl: 24 * 60 * 60,
        }),
        cookie:{ maxAge: 24 * 60 * 60 * 1000 },
    })
);

app.set("view engine","ejs");
app.set("views",[

    path.join(__dirname, "src","views","user"),    
    path.join(__dirname, "src","views","admin")    

]);


// Make session data available in all Ejs files
app.use((req, res, next)=>{
    res.locals.user = req.session.user || null;
    res.locals.admin = req.session.admin || null;
    next();
});


// Passport setup
app.use(passport.initialize());
app.use(passport.session());



app.use(express.static(path.join(__dirname, "public")))


app.use(noCache());
 
app.use('/', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes)


connectDB()



app.listen(3000,()=>{
    console.log("http://localhost:3000/home")
})