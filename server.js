// server.js App

// load the things we need
const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const fs = require("fs");
const nodemailer = require("nodemailer"); // Mailing service module to install before importation


//Mongo DB uitilities
const mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const url = "mongodb://localhost:27017/";
const myDB= "myLocalMongoDB";
const myCollection = "students";

//Express App Instanciation
const app = express();

// set the view engine to ejs
app.set("view engine", "ejs");

app.use(express.static("views"));
app.use(express.static(__dirname + "/views/assets"));

app.use(bodyParser.json()); // support json encoded bodies

app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//Settings: file upload && App

//-->upload
const maxSize = 2 * 1024 * 1024;
const imgExtPattern = /\.(jpg|jpeg|png|gif)$/;
const uploadDirectory = __dirname + "/views/assets/images";

//-->App
const port = process.env.PORT || 8081;

// Create multer disk storage
const Storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const newPictureImgName =
      req.body.firstName + "." + file.originalname.split(".", 2)[1];
    req.body.src = newPictureImgName;
    req.body.alt = req.body.firstName;

    callback(null, newPictureImgName);
  }
});

// Create multer obj for uploading
const upload = multer({
  storage: Storage,
  limits: { fileSize: maxSize },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(imgExtPattern)) {
      console.log("file:", file.originalname);
      return cb(new Error("Only image files are allowed!"));
    }
    cb(null, true);
  }
}).single("studentPicture"); //Field name

// index page
app.get("/", (req, res) => {

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    const dbo = db.db(myDB);
    dbo.collection(myCollection).find({}).sort([['_id',-1]]).toArray((err, result) => {
      if (err) throw err;
      console.log("Index page is shown");
      res.render("pages/index", { students: result });
      db.close();
    });
  }); 
});

// about page
app.get("/about", function(req, res) {
  res.render("pages/about");
});

// add page
app.get("/add", (req, res) => {
  res.render("pages/add");
});

// add confirmation page
app.post("/addConfirmation", (req, res) => {
  
  upload(req, res, function(err) {
    if (err) {
      return res.render("pages/addConfirmation", {
        message: "Error: Student not added and image not uploaded"
      });
    }
  

    delete req.body.studentPicture;
    req.body.skills = req.body.skills.split(",");

    MongoClient.connect(url, (err, db) => {
      if (err) throw err;

      const dbo = db.db(myDB);
      const objToAdd = req.body;
      console.log(req.body);
      dbo.collection(myCollection).insertOne(req.body, (err, result) => {
        if (err) throw err;
         return res.render("pages/addConfirmation", {
          message:
            "Success: New Student Added successfully and image uploaded to server..."
        });

        console.log("1 student inserted");
        db.close();
      });
    });
  });
});


// details page
app.get("/details/:_id", function(req, res) {
  
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(myDB);
    dbo.collection(myCollection).findOne({_id: new ObjectID(req.params._id)}, function(err, result) {
      if (err) throw err;

      res.render("pages/details", {
        student: result
      });

      console.log('details page is shown...');
      db.close();
    });
  });
  
});

// update page
app.get("/update/:_id", function(req, res) {

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(myDB);
    dbo.collection(myCollection).findOne({_id: new ObjectID(req.params._id)}, function(err, result) {
      if (err) throw err;

      res.render("pages/update", {
        student: result
      });

      console.log('update page is shown...');

      db.close();
    });
  });

});


// update confirmation page
app.post("/updateConfirmation", function(req, res) {

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    const dbo = db.db(myDB);
    
    const myquery = { _id: new ObjectID(req.body._id)};
    const newvalues = { $set: req.body };

    req.body.skills = req.body.skills.split(",");
    delete req.body._id;

    dbo.collection(myCollection).findOneAndUpdate(myquery, newvalues, (err, result) => {
      
      if (err) res.render("pages/updateConfirmation", { message: 'Error: Failed to update this student!' });;

      res.render("pages/updateConfirmation", { message : 'Success: Student updated successfully' });
      
      console.log("1 document updated");

      db.close();
    });
  });
});


//Delete page
app.get("/delete/:_id/:imgSrc", function(req, res) {

  const linkToImg =__dirname + "/views/assets/images/" + req.params.imgSrc;

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    const dbo = db.db(myDB);
    const myquery = {_id: new ObjectID(req.params._id)};
    dbo.collection(myCollection).findOneAndDelete(myquery, (err, result) => {
      if (err) res.render("pages/delete", { message: "File deleted!" });

      fs.unlink(linkToImg, err => {
        //Delete image from images folder
        if (err) res.render("pages/delete", { message: "File fials to delete!" });
      });
      
      res.render("pages/delete", { message: "Success: Student deleted" });
      
      console.log("1 document deleted:");

      db.close();
    });
  });
});

//Contact page
app.get("/contact", (req, res) => {
  res.render("pages/contact");
});

//Contact confirmation page
app.post("/contactConfirmation", (req, res) => {
  let { firstname, lastname, email, message } = req.body;
  const info = `<h1>Express Node Application</h1>
    <h3>Email sent by mouhssine</h3>
    <p>
    <h3>Form details:</h3>
        firstname: ${firstname}
        <br/> lastname: ${lastname}
        <br/> email: ${email}
        <br/> message: ${message}
        <br/>
        <p>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "mouhssineidrissiakhelij1982@gmail.com",
      pass: "xxxxxx"
    }
  });

  var mailOptions = {
    from: "mouhssineidrissiakhelij1982@gmail.com",
    to: "asabeneh@gmail.com, mouhssineidrissiakhelij1982@gmail.com",
    subject: "Sending Email using Node.js and Express",
    html: "<p>" + info + "</p>"
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.render("pages/contactConfirmation", {
        message: " Error: email sending fails!"
      });
    } else {
      res.render("pages/contactConfirmation", {
        message: "Success: Email sent successfully."
      });
    }
  });
});

app.listen(port);
console.log(
  "Integrify Photos Gallery App Server is running on the port 8081..."
);