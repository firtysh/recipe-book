require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypyt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");

//require schemas
const User = require("./models/user");
const Recipe = require("./models/recipe");

const app = express();
const port = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
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
        if(jwt.verify(req.cookies.token,process.env.JWT_SECRET) && await User.findById(jwt.decode(req.cookies.token)._id)!==null){
            loggedin=true;
            let recipes = await Recipe.find({userid:jwt.decode(req.cookies.token)._id})
            if(req.query.search){
                recipes = recipes.filter(recipe=>{return recipe.title.toLowerCase().includes(req.query.search.toLowerCase()) || recipe.ingredients.toLowerCase().includes(req.query.search.toLowerCase())});
            }
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
            loggedin=true;
            const recipe = await Recipe.findById(req.params.id);
            console.log(recipe._id);
            res.render("main", {loggedin:loggedin,recipe:recipe,page: "recipe"});
        }else{
            res.redirect("/login");
        }
    } catch (error) {
        
    }
})
app.get('/delete/:id',async (req,res)=>{
    try {
        if(req.cookies.token && jwt.verify(req.cookies.token,process.env.JWT_SECRET)){
            loggedin=true;
            const recipe = await Recipe.findByIdAndDelete(req.params.id);
            console.log(recipe);
            if(!recipe.image.islink){
            fs.unlink(`${__dirname}/uploads/${recipe.image.url}`,(err)=>{
                console.log(err ? `${err}` : `${recipe.image.url} deleted`);})
            }
            res.redirect("/");
        }else{
            res.redirect("/login");
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
                    url : 'https://source.unsplash.com/random/?food'
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
app.post('/editrecipe',upload.single('image'),async (req,res)=>{
    try{
        if(req.cookies.token && jwt.verify(req.cookies.token,process.env.JWT_SECRET)){
            const [_id,title,desc,vegornonveg,ingredients,instructions,notes,img] = [req.body.id,req.body.title,req.body.desc,req.body.vegornonveg,req.body.ingredients,req.body.instructions,req.body.notes,req?.file?.filename ];
            let image;
            console.log(_id,title,desc,vegornonveg,ingredients,instructions,notes,img);
            if(img==='' || img===undefined){
                const recipe = await Recipe.findByIdAndUpdate(_id,{title,desc,vegornonveg,ingredients,instructions,notes});
                console.log(recipe);
                res.redirect('/');
            }else{
                image ={
                    islink:false,
                    url : img
                }
                const recipe = await Recipe.findByIdAndUpdate(_id,{title,desc,vegornonveg,ingredients,instructions,notes,image});
                if(!recipe.image.islink){
                    fs.unlink(`${__dirname}/uploads/${recipe.image.url}`,(err)=>{
                        console.log(err ? `${err}` : `${recipe.image.url} deleted`);})
                    }
                res.redirect('/');
            }
            
        }else{
            res.status(401).send("Unauthorized");
        }
    }
    catch(error){
        console.log(error);
    }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
