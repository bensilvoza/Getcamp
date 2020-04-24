
//require
var express = require("express");  //express framework
var bodyParser = require("body-parser");
var ejs = require("ejs");
var methodOverride = require("method-override");
var flash = require("connect-flash");
var mongoose = require("mongoose");
var passport = require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var expressSession = require("express-session");

//use
var app = express();
app.use( bodyParser.urlencoded({extended: true}) );
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());


//database

var url = process.env.DATABASEURL || "mongodb://localhost/getcampDB"
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});


//notes for database
  //Embedding data - inserting entire content
  //Referencing data - inserting _id only, but that _id is somehow consist of entire content
//user
 //user with passportLocalMongoose
 var userSchema = new mongoose.Schema({"username": String, "password": String});
     //userSchema {"username": String, "password": String}
     userSchema.plugin(passportLocalMongoose);
 var User = mongoose.model("User", userSchema);
//comments
  var commentSchema = new mongoose.Schema({"text": String, "author": {
        "id": {type: mongoose.Schema.Types.ObjectId, ref: "User"},
        "username": String
      }
    });
    //commentSchema {"text": String, author: {"id": 5e5f9d56d57f2e4bec7823, "username": String}}
  var Comment = mongoose.model("Comment", commentSchema);
//getcamp
  var campSchema = new mongoose.Schema({"image": String, "name": String, "body": String,
  "author": {"id": {type: mongoose.Schema.Types.ObjectId, ref: "User"}, "username": String},
      "comments": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}] });
  var Camp = mongoose.model("Camp", campSchema);
  //campSchema {"image": String, "name": String, "body": String, "author": {"id": 5e5f9d56d57f2e4bec7823, "username": String}, "comments": [5e5f9d56d57f2e4bec7823, 5e5f9d56d57f2e4bec7823, 5e5f9d56d57f2e4bec7823]}


//Passport authentication
app.use(expressSession({"secret": "Once again Camping cabins", "resave": false, "saveUninitialized": false}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//
  app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
  });



//root
app.get("/", function(req, res){
	// res.render("landing");
  res.redirect("/camps");
});

//=======
//getcamp
//=======
//Index
app.get("/camps", function(req, res){
    Camp.find({}, function(err, camps){
		if(err) {
			console.log(err);
		}
		else {
			res.render("camp-index", {"camps": camps});
		}
    });
});

//Create
app.post("/camps", isLoggedIn, function(req, res){	
	
    var userInput = {
	    "image": req.body.image,
        "name": req.body.name,
	    "body": req.body.body
       }
    var author = {
                  "id": req.user._id,
                  "username": req.user.username
                }

    var userInputSubmit = new Camp({"image": userInput["image"], "name": userInput["name"], "body": userInput["body"],
      "author": {"id": author["id"], "username": author["username"]}
    });
    userInputSubmit.save(function(err){
		if(err) {
			console.log(err);
		}
		else {
			res.redirect("/camps");
		}
	});
});

//New
app.get("/camps/new", isLoggedIn, function(req, res){
    res.render("camp-new");
});

//Show
app.get("/camps/:id", function(req, res){
	var paramsUrl = req.params.id;
	Camp.findOne({"_id": paramsUrl}).populate("comments").exec( function(err, camp){
		if (err){
			//If there's potential error
			console.log(err);
			res.redirect("/camps/new");
		}
		else {
          res.render("camp-show", {"camp": camp});
		}
	});
});


//I will be following coding best practices as a must but this will be temporary here
//show
app.get("/cabin/search", function(req, res){
	var campSearch = req.param("cabin");
	var campSearchSubmit ="";
	for (var i = 0; i < campSearch.length; i++){
		if (i === 0) {
		  campSearchSubmit = campSearch[i].toUpperCase();
		}
		else {
			campSearchSubmit = campSearchSubmit + campSearch[i];
		}
	}
	Camp.findOne({"name": campSearchSubmit}, function(err, camp){
		if (err){
			//If there's potential error
			console.log(err);
			res.redirect("back");
		}
		else {
			if(camp){
				res.redirect("/camps/" + camp["_id"]);
			}
			else {
				res.redirect("back");
			}
		}
	});
});
//end


//if he she owns the camping cabins can edit, update and destroy
//edit
app.get("/camps/:id/edit", checkCampOwnership, function(req, res){
  var paramsUrl = req.params.id;
  Camp.findOne({"_id": paramsUrl}, function(err, camp){
    if (err){
      console.log(err);
    }
    else {
      res.render("camp-edit", {"camp": camp});
    }
  });
});

//update
app.put("/camps/:id", checkCampOwnership, function(req, res){
  var paramsUrl = req.params.id;
  var userInput = {"image": req.body.image, "name": req.body.name, "body": req.body.body}
  Camp.findOneAndUpdate({"_id": paramsUrl}, userInput, function(err, updatedCamp){
    if(err) {
      console.log(err);
    }
    else {
      res.redirect("/camps/" + updatedCamp["_id"]);
    }
  });
});

//destroy
app.delete("/camps/:id", checkCampOwnership, function(req, res){
  var paramsUrl = req.params.id;
  Camp.findOneAndRemove({"_id": paramsUrl}, function(err){
    if(err) {
      console.log(err);
    }
    else {
      res.redirect("/camps");
    }
  });
});


//=======
//comment
//=======
//new
app.get("/camps/:id/comments/new", isLoggedIn, function(req, res){
  var paramsUrl = req.params.id;
  Camp.findOne({"_id": paramsUrl}, function(err, camp){
    if (err){
      console.log(err);
    }
    else {
      res.render("comment-new", {"camp": camp});
    }
  });
});

//create
app.post("/camps/:id/comments", isLoggedIn, function(req, res){
  var paramsUrl = req.params.id;
  Camp.findOne({"_id": paramsUrl}, function(err, camp){
    if (err){
      console.log(err);
    }
    else {
      var userInput = {"author": {"id": req.user._id, "username": req.user.username}, "text": req.body.text}
      var userInputSubmit = new Comment({"author": {"id": userInput["author"]["id"], "username": userInput["author"]["username"]}, "text": userInput["text"]});
      camp.comments.push(userInputSubmit);
      userInputSubmit.save();
      camp.save();
      res.redirect("/camps/" + camp["_id"]);
    }
  });
});

//if he she owns the comment can edit, update and destroy
//edit
app.get("/camps/:id/comments/:comment_id/edit", checkCommentOwnership, function(req, res){
  var paramsUrl = req.params.id;
  Comment.findOne({"_id": req.params.comment_id}, function(err, comment){
    if (err){
      console.log(err);
    }
    else {
      res.render("comment-edit", {"camp": paramsUrl, "comment": comment});
    }
  });
});

//update
app.put("/camps/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
  var paramsUrl = req.params.id;
  var userInput = {"text": req.body.text}
  Comment.findOneAndUpdate({"_id": req.params.comment_id}, userInput, function(err, comment){
    if (err){
      console.log(err);
      res.redirect("back");
    }
    else {
      res.redirect("/camps/" + paramsUrl);
    }
  });
});

//destroy
app.delete("/camps/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
  var paramsUrl = req.params.id;
  Comment.findOneAndRemove({"_id": req.params.comment_id}, function(err){
    if (err){
      res.redirect("back");
    }
    else {
      res.redirect("/camps/" + paramsUrl);
    }
  });
});

//==============
//authentication
//==============
//sign up form
app.get("/register", function(req, res){
  res.render("auth-register");
});

app.post("/register", function(req, res){
  var username = new User({"username": req.body.username});
  var password = req.body.password;
  User.register(username, password, function(err, user){
    if (err){
      req.flash("error", err.message);
      return res.render("auth-register");
    }
    else {
      passport.authenticate("local")(req, res, function(){
        req.flash("success", "Welcome to Getcamp, " + user.username + "!");
        res.redirect("/camps");
      });
    }
  });
});

//login form
app.get("/login", function(req, res){
   res.render("auth-login");
});

//app.post("/login, middleware, callback");
app.post("/login",passport.authenticate("local",
  {
    successRedirect: "/camps",
    failureRedirect: "/login"
  }), function(req, res){
});

//Logout
app.get("/logout", function(req, res){
  req.logout();
  req.flash("success", "Successfully Logout");
  res.redirect("/camps");
});

//==========
//middleware
//==========
//isLoggedIn
function isLoggedIn(req, res, next){
  if (req.isAuthenticated()){
    return next();
  }
  else {
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
  }
}

//checkCampOwnership
function checkCampOwnership(req, res, next) {
  if (req.isAuthenticated()){
    var paramsUrl = req.params.id;
    Camp.findOne({"_id": paramsUrl}, function(err, camp){
      if (err){
        req.flash("error", "Camping_cabin not found");
        res.redirect("back");
      }
      else {
        if (camp.author.id.equals(req.user._id)){
          next();
        }
        else {
          req.flash("error", "You don't have permission to do that");
          res.redirect("back");
        }
      }
    });
  }
  else {
    req.flash("error", "You need to be logged in to do that");
    res.redirect("back");
  }
}

//checkCommentOwnership
function checkCommentOwnership(req, res, next) {
  if (req.isAuthenticated()){
    Comment.findOne({"_id": req.params.comment_id}, function(err, comment){
      if (err){
        console.log(err);
        res.redirect("back");
      }
      else {
        if (comment.author.id.equals(req.user._id)){
          next();
        }
        else {
          req.flash("error", "You don't have permission to do that");
          res.redirect("back");
        }
      }
    });
  }
  else {
    req.flash("error", "You need to be logged in to do that");
    res.redirect("back");
  }
}


app.listen(process.env.PORT || 3000, function(){
	console.log(".");
	console.log(".");
	console.log(".");
	console.log("Getcamp server started");
});





