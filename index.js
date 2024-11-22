require('dotenv').config();
const express       = require('express');
const mongoose      = require('mongoose');
const cors          = require('cors');
const jwt           = require('jsonwebtoken');
const studentModel  = require('./model/Student');
const passport      = require("passport");
const session       = require("express-session");
const app           = express();
const PORT          = process.env.PORT || 5000;
const MONGO_URI     = process.env.MONGO_URI;
const allowedOrigin = 'http://localhost:3000';
require("./passport");
app.use(express.json())
app.use(cors());

app.use(
    session({
      secret: process.env.SECRET_KEY,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    })
  );

app.use(passport.initialize());
app.use(passport.session());

app.use(cors({
  origin: allowedOrigin,           // Allow specific origin
  methods: ['GET', 'POST'],        // Allow specific HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'],  // Allowed headers
  credentials: true                // Allow credentials (cookies, auth headers)
}));

app.get(
  "/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication failed" });
    }
    const userName = req.user?.displayName;
    const userEmail = req.user?.emails?.[0]?.value || "Unknown Email";

    // Generate a JWT token
    const token = jwt.sign(
      { id: req.user.id, email: userEmail },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );
    // Redirect with query parameters
    const redirectUrl = `${process.env.FRONT_END_URI}?email=${encodeURIComponent(
      userEmail
    )}&token=${encodeURIComponent(token)}&userName=${encodeURIComponent(userName)}`;
    // Ensure only one response is sent
    res.redirect(redirectUrl);
  }
);

app.get("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to destroy session" });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: "Logged out successfully" });
    });
  });
});

app.get("/api/auth/current-user", (req, res) => {
  res.send(req.user || null);
});

mongoose.connect(MONGO_URI);

app.post("/login", (req, res) => {
    const {email, password} = req.body;
    studentModel.findOne({email : email})
    .then(user => {
        if(user) {
            if(user.password === password){
                const token = jwt.sign({ id: user._id, email: user.email }, process.env.SECRET_KEY, { expiresIn: '1h' });
                res.json({success:true,token:token,name:user.name,email:user.email});
            }else{
                res.json({success:false,message:"Password is incorrect"})
            }
        }else{
            res.json({success:false,message:"No record existed"})
        }
    })
})

app.post("/register", (req, res) => {
    const {email} = req.body;
    studentModel.findOne({email : email}).then(user => {
      if(user){
        res.json({success:false,message:"This email id is taken.Use different email id"})
      }else{
        studentModel.create(req.body)
        .then(employees => res.json({success:true,message:"User successfully registered"}))
        .catch(err => res.json(err))
      }
    })
});

const resultSchema = new mongoose.Schema({
  email:String,
  score:Number,
  totalQuestions:Number,
  percentage:Number,
  performance:String,
  topicFeedback:String,
  date:{type:Date, default:Date.now}
});

const Result = mongoose.model('Result', resultSchema);
app.post('/api/saveResults', async (req, res) => {
  try {
    const { email, score, totalQuestions, performance, topicFeedback } = req.body;
    const percentage = (score / totalQuestions) * 100;
    const result = new Result({ email, score, totalQuestions, percentage, performance, topicFeedback });
    await result.save();
    res.status(201).json({ message: 'Result saved successfully!', result });
  } catch (error) {
    res.status(500).json({ message: 'Error saving result.', error });
  }
});

// API to get all results
app.post('/api/getResults', async (req, res) => {
  try {
    const { email } = req.body;
    const results = await Result.find({email});
    res.status(200).json({success:true, data:results});
  } catch (error) {
    res.status(500).json({success:false, message: 'Error fetching results.', error });
  }
});

app.listen(PORT, () => {
    console.log("server is running")
})