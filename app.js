require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const app = express();
const encrypt = require('mongoose-encryption');

app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

 mongoose.connect("mongodb://localhost:27017/usersDB", {useNewUrlParser: true}, (err) => {
    if(err) console.log(err) 
    else console.log("mongdb is connected");
   });

 const userSchema = new mongoose.Schema ({
     username: String,
     password: String
 });

 var encKey = process.env.ENC_KEY;
 var sigKey = process.env.SIG_KEY;
 userSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey, encryptedFields: ["password"] });
 
 const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res) {
    res.render("home")
});

app.route("/register")
    .get(function(req, res) {
        res.render("register")
    })
    .post(function(req, res) {

        const user = new User({
            username: req.body.username,
            password: req.body.password
        })
        user.save();
        res.redirect("/login")
    });

app.route("/login")
    .get(function(req, res) {
        res.render("login")
    })
    .post(function(req, res) {
        User.findOne({username: req.body.username}, function(err, docs) {
            if(!docs) {res.send("Username does not exist")}
            else{
                if(docs.password === req.body.password) {
                    res.render("secrets")
                } else {
                    res.send("incorrect password")
                }
            }
        })
    });    

app.route("/submit")
    .get(function(req, res) {

    })
    .post(function(req, res) {
        
    });


app.listen(3000, function() {
    console.log("listening on port 3000")
});


// mongoose-encryption(used to encrypt passwords, can authenticate)