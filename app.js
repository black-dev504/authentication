require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

mongoose.connect('mongodb://localhost:27017/userDB')
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error: ", err));

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'check name entry']
  },
  password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.route('/')

  .get(function (req,res) {
      res.render('home');
  });

  app.route('/login')
    .get((req, res) => res.render('login'))
    .post((req, res) => {
      const user = new User({
        username: req.body.username,
        password: req.body.password
      });

      req.login(user, (err) => {
        if (err) {
          return res.redirect('/login'); // Handles the error gracefully by redirecting
        }
        passport.authenticate('local')(req, res, () => res.redirect('/secrets'));
      });
    });

app.route('/logout')
  .get((req,res) =>{
    req.logout(() => res.redirect('/login'))
  })


app.route('/register')

  .get(function (req,res) {
      res.render('register');
  })
  .post(function (req,res) {
    User.register({username:req.body.username}, req.body.password, function(err, user) {

        if (err) {
          console.log(err);
          return res.redirect("/register")
      }
      // Authenticate the user after successful registration
          passport.authenticate('local')(req, res, function(){
          res.redirect('/secrets');

  });

});
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Apply the middleware to protect the secrets route
app.route('/secrets')
  .get(ensureAuthenticated, (req, res) => {
    res.render('secrets');
  });



app.listen(3000, function () {
  console.log('active');
})
