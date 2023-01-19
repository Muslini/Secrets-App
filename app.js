require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const app = express();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;
const PORT = 10000 || 3030;

const messages = ["", "Incorrect email or password, Please try again.", "Registration was successful, please login!"];

app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(express.json());
app.use(session({
    secret: "I need to find a wife",
    resave: false,
    saveUninitialized: false,
    name: "Secrets.app",
    cookie: {

    }
}))
app.use(passport.initialize());
app.use(passport.session());

const URL = process.env.CONNECT_URL;

 mongoose.connect(URL, {useNewUrlParser: true}, (err) => {
    if(err) console.log(err) 
    else console.log("mongdb is connected");
   });

 const userSchema = new mongoose.Schema ({
     username: String,
     password: String,
     googleId: String,
     facebookId: String,
     secrets: []
 });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

 
 const User = new mongoose.model("User", userSchema);

 passport.use(User.createStrategy());

 passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-app-3s9a.onrender.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "https://secrets-app-3s9a.onrender.com/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
  console.log(profile);
}
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });



app.get("/", function(req, res) {
    res.render("home")
});


app.route("/register")
    .get(function(req, res) {
        res.render("register", {displayFailure: messages[0]})
    })
    .post(function(req, res) {
        User.register({username: req.body.username}, req.body.password, function(err, user) {
            if(err) {
                console.log(err);
                res.render("register", {displayFailure: err})
            } else {
              res.render("login", {displaySuccess: messages[2], displayError: messages[0]})
            }
        })
    });

app.route("/login")
    .get(function(req, res) {
        res.render("login", {displayError: messages[0], displaySuccess: messages[0]})
    })
    .post(function(req, res, next) {
        const user = new User ({
            username: req.body.username,
            password: req.body.password
        })
        passport.authenticate("local", function(err, user, info){
          if(err) {
            return next(err)
          }
          if(!user) {
            return res.render("login", {displayError: messages[1], displaySuccess: messages[0]})
          }
          req.login(user, function(err) {
            if(err) {
                return next(err);
            }
            return res.redirect("/secrets")
            });
        }) (req, res, next);
    });

app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if(err) {
            return(err)
        } else {
            res.redirect("/");
        }
    })

})   
    
app.get("/secrets", function(req, res) {
    if (req.isAuthenticated()) {
        User.find({secret: {$ne: []}}, function(err, foundUsers){
            if (err){
              console.log(err);
            } else {
              if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
              }
            }
          });
    } else {
        res.redirect("/login")
    }
})

app.get("/mysecrets", function(req, res) {
    if(req.isAuthenticated()) {
        User.findById(req.user.id, function(err, doc){
            if (err){
              console.log(err);
            } else {
              if (doc) {
                res.render("mysecrets", {userSecrets: doc.secrets, userID: doc.id});
              }
            }
          });
    } else {
        res.redirect("/login")
    }
})


app.route("/submit")
    .get(function(req, res) {
        if (req.isAuthenticated()){
            res.render("submit");
          } else {
            res.redirect("/login");
          }
    })
    .post(function(req, res) {
      let enteredSecret = req.body.secret

        User.findById(req.user.id, function(err, docs) {
            if(err) {
                console.log(err)
            } else {
                if(docs) {
                    docs.secrets.push(enteredSecret);
                    docs.save(function() {
                        res.redirect("/secrets")
                    });
                };
            };
        })

    });


app.post("/delete", function(req,res) {
  const json = JSON.parse(req.body.button)
   const delItem = json.first;
   const index = json.second;
   console.log(delItem);
    User.findById(delItem, async function(err, doc) {
      if(err) {
        console.log(err)
      } else {
        doc.secrets.splice(index, 1)
        await doc.save(function() {
          res.redirect("/mysecrets")
        });
      };
    });
});


// Login or register with socials

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {

    res.redirect("/secrets");
  });

  app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    
    res.redirect("/secrets");
  });


  app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`);
  });


// mongoose-encryption(used to encrypt passwords, can authenticate)
