require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth2');
const findOrCreate = require('mongoose-findorcreate');
const LocalStrategy = require('passport-local');


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
  cookie: { secure: process.env.NODE_ENV }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  password: String,
  googleId:String,
  secrets: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model('User', userSchema);

passport.use('local', new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!user.verifyPassword(password)) { return done(null, false); }
      return done(null, user);
    });
  }
));
passport.use('google', new GoogleStrategy({
    clientID:process.env.OAUTH_CLIENT,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
   },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
          return cb(err, user);
  })
}
));

passport.serializeUser(function(user, done) {
  done(null, user.id); // Serialize the user by their MongoDB ID
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user); // Deserialize the user using the ID stored in the session
  });
});


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
    console.log(isAuthenticated());
    res.render('secrets');
  });

  app.get('/auth/google',
    passport.authenticate('google', { scope:
        [ 'email', 'profile' ] }
  ));

  app.get( '/auth/google/secrets',
      passport.authenticate( 'google', {
          successRedirect: '/secrets',
          failureRedirect: '/register'
  }));

app.route('/submit')
.get(function (req,res) {
  if (req.isAuthenticated()) {
    res.render('/submit');
  }else {
    res.render('/login')
  }
})
.post(() => {
  const submittedSecret = req.body.secret;
  const userId = req.user.id
  User.findById(userId, function (err, foundUser) {
      if (err){
          console.log(err);
      }
      else{
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(function () {
            res.redirect('/secrets')
          })
        }else{
          res.redirect('/login')
        }
      }
  })
});

app.listen(3000, function () {
  console.log('active');
})
