require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypyt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

//require schemas
const User = require("./models/user");
const Recipe = require("./models/recipe");

const app = express();
const port = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(cookieParser());
app.use("/css", express.static(__dirname + "/node_modules/bootstrap/dist/css"));
app.use("/js", express.static(__dirname + "/node_modules/bootstrap/dist/js"));
app.use(express.static(__dirname + "/uploads"));

//template engine setup
app.set("views", "./views");
app.set("view engine", "ejs");

let loggedin=false;


// DB Connection
mongoose.connect(process.env.MONGODB_URI,{useNewUrlParser: true,useUnifiedTopology:true}).then(() => {
  console.log("connected");
});

// get Routes
app.get("/", async (req, res) => {
    if(req.cookies.token){
        if(jwt.verify(req.cookies.token,process.env.JWT_SECRET)){
            loggedin=true;
            let recipes = await Recipe.find({userid:jwt.decode(req.cookies.token)._id})
            res.render('main',{loggedin:loggedin,recipes:recipes});
        }else{
            loggedin=false;
            res.redirect("/login");
        }
    }else{
    loggedin=false;
    res.redirect("/login");
    }
});
app.get("/login", (req, res) => {
    console.log(req.cookies);
    if(loggedin === true){
        res.redirect("/");
    }else{
        res.render("main", {loggedin,page: "login",error:''});
    }
});
app.get("/signup", (req, res) => {
    if(loggedin === true){
        res.redirect("/");
    }else{
        res.render("main", {loggedin,page: "signup",error:''});
    }
});
app.get('/logout',(req,res)=>{
    res.clearCookie('token');
    res.redirect('/login');
})
app.get("/recipe/:id",async (req, res) => {
    try {
        if(req.cookies.token && jwt.verify(req.cookies.token,process.env.JWT_SECRET)){
            const recipe = await Recipe.findById(req.params.id);
            console.log(recipe);
            res.render("recipe", {loggedin:loggedin,recipe:recipe});
        }
    } catch (error) {
        
    }
})


// post Routes
app.post("/signup", async (req, res) => {
  try {
    const [name, email, password] = [
      req.body.name_signup,
      req.body.email_signup,
      await bcrypyt.hash(req.body.password_signup, 10),
    ];
    console.log(name, email, password);
    const user = await User.create({ name, email, password });
    const token = jwt.sign({_id:user._id,name:user.name},process.env.JWT_SECRET);
    loggedin = true;
    res.cookie('token', token,{maxAge:24*3600000}).redirect('/');
  } catch (error) {
    if(error.code === 11000){
      res.render("main", { loggedin: loggedin, page: "signup", error: "Email already exists" });
    }else{
        console.log(error);
      res.render("main", { loggedin: loggedin, page: "signup", error: "Something went wrong" });
    }
  }
});
app.post('/login',async (req,res)=>{
    try{
        const [email,password] = [req.body.email_login,req.body.password_login];
        console.log(req.body.password_login);
        console.log(email,password);
        const user = await User.findOne({email}).lean();
        if(user===null){
            res.render("main", { loggedin: loggedin, page: "login", error: "No User Found !!" });
        }else if( await bcrypyt.compare(password,user.password)){
            const token = jwt.sign({_id:user._id,name:user.name},process.env.JWT_SECRET);
            loggedin = true;
            let expiration;
            if(req.body?.remember_login === "on"){
                expiration = 30*24*3600000;
            }else{
                expiration = 24*3600000;
            }
            res.cookie('token', token,{maxAge:expiration}).redirect('/');
        }else{
            res.render("main", { loggedin: loggedin, page: "login", error: "Email or password is incorrect" });
        }
    }catch(error){
        console.log(
        error
        );
        res.render("main", { loggedin: loggedin, page: "login", error: error });
    }
})
app.post('/addrecipe',upload.single('image'),async (req,res)=>{
    try{
        if(req.cookies.token && jwt.verify(req.cookies.token,process.env.JWT_SECRET)){
            const [title,desc,vegornonveg,ingredients,instructions,notes] = [req.body.title,req.body.desc,req.body.vegornonveg,req.body.ingredients,req.body.instructions,req.body.notes];
            const img = req?.file?.filename || "";
            let image;
            if(img===''){
                image ={
                    islink:true,
                    url : 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=800&q=60'
                }
            }else{
                image ={
                    islink:false,
                    url : img
                }
            }
            const recipe = await Recipe.create({userid:jwt.decode(req.cookies.token)._id,title,desc,vegornonveg,ingredients,instructions,notes,image});
            res.redirect('/');
        }else{
            res.status(401).send("Unauthorized");
        }
    }
    catch(error){
        console.log(error);
    }
})
app.post('/editrecipe',upload.single('image'),async (req,res)=>{})
app.post('/deleterecipe',async (req,res)=>{})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
