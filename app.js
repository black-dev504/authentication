require('dotenv').config()

const express = require('express');
const bodyparser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 10;

mongoose.connect('mongodb://localhost:27017/userDB');

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({extended:true}));

const userSchema = new mongoose.Schema({
  email:{
    type:String,
    required:[true,'check name entry']
  },
  password:{
    type:String,
    required:[true,'check password entry']
  }
})




const User = new mongoose.model('user', userSchema)

app.route('/')

  .get(function (req,res) {
      res.render('home');
  });

app.route('/login')

  .get(function (req,res) {
      res.render('login');
  })
  .post(function (req,res) {

    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email:username}).then(function(foundUser){
      bcrypt.compare(password, foundUser.password).then(function(result) {

        if (result) {
          res.render('secrets')
        }

        });
     }).catch((err)=>{
         console.log(err);
     })
  })

app.route('/register')

  .get(function (req,res) {
      res.render('register');
  })
  .post(function (req,res) {
      bcrypt.hash(req.body.password, saltRounds).then(function(hash) {
        const newUser = new User({
          email: req.body.username,
          password: hash
        })
      newUser.save().then(()=>{
           res.render("secrets");
       }).catch((err)=>{
           console.log(err);
       })


      });

 });


app.listen(3000, function () {
  console.log('active');
})
