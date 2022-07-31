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
            console.log(recipes);
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
    const dummy_data= [
        {userid:user._id,desc:"It's easy and uses pantry staples. Always a hit with adults and kids. Serve with basmati rice or quinoa and steamed or roasted vegetables.",title:"Honey-Garlic Slow Cooker Chicken Thighs",ingredients:"4 skinless, boneless chicken thighs,½ cup soy sauce,½ cup ketchup,⅓ cup honey,3 cloves garlic, minced,1 teaspoon dried basil",vegornonveg:"nonveg",instructions:"1. Lay chicken thighs into the bottom of a 4-quart slow cooker.\n 2.Whisk soy sauce, ketchup, honey, garlic, and basil together in a bowl; pour over the chicken.\n 3. Cook on Low for 6 hours.",image:{islink:true,url:'https://imagesvc.meredithcorp.io/v3/mm/image?url=https%3A%2F%2Fstatic.onecms.io%2Fwp-content%2Fuploads%2Fsites%2F43%2F2015%2F12%2F1411947_Honey-Garlic-Slow-Cooker-Chicken-Thighs_236609-_Photo-by-Sherri.jpg'},},
        {userid:user._id,desc:"Naan (pronounced nahn) is an oven-baked, leavened bread that is stuffed and flavored in a variety of ways. An essential part of South and Central Asian cuisine, naan is easy, affordable, and makes the most of pantry ingredients you already have on hand.",title:"Naan",ingredients:"1 (.25 ounce) package active dry yeast, 1 cup warm water, ¼ cup white sugar, 3 tablespoons milk, 1 large egg, beaten, 2 teaspoons salt,4 ½ cups bread flour,2 teaspoons minced garlic (Optional),¼ cup butter, melted",vegornonveg:"veg",instructions:'Step 1\n'+ 'Dissolve yeast in warm water in a large bowl. Let stand about 10 minutes, until frothy.\n'+ '\n'+ 'Step 2\n'+ 'Meanwhile, generously oil a large bowl.\n'+ '\n'+ 'Step 3\n'+ 'Stir sugar, milk, egg, and salt into the yeast mixture. Mix in enough flour to make a soft dough.\n'+ '\n'+ 'Step 4\n'+ 'Knead dough on a lightly floured surface until smooth, 6 to 8 minutes.\n'+ '\n'+ 'Step 5\n'+ 'Place dough in the prepared oil, cover with a damp cloth, and let rise until doubled in size, about 1 hour.\n'+ '\n'+ 'Step 6\n'+ 'Punch down dough on a lightly floured surface, and knead in garlic. Pinch off small handfuls of dough about the size of a golf ball; you should have about 14. Roll each piece into a ball and place on a tray. Cover with a towel, and allow to rise until doubled in size, about 30 minutes.\n'+ '\n'+ 'Step 7\n'+ 'Meanwhile, preheat a large grill pan over high heat.\n'+ '\n'+ 'Step 8\n'+ 'Roll each piece of dough into a thin circle.\n'+ '\n'+ 'Step 9\n'+ 'Brush some melted butter on the preheated grill pan. Place a few pieces of dough in the pan (as many as you can fit) and cook until puffy and lightly browned, 2 to 3 minutes. Brush butter onto the uncooked sides, flip, and cook until browned, 2 to 4 more minutes. Remove from the grill and repeat to cook the remaining naan.',image:{islink:true,url:'https://imagesvc.meredithcorp.io/v3/mm/image?url=https%3A%2F%2Fstatic.onecms.io%2Fwp-content%2Fuploads%2Fsites%2F43%2F-0001%2F11%2F30%2F1016308.jpg'},},
        { image: { islink: true, url: 'https://images.unsplash.com/photo-1608735540849-dab94904ba24?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80' }, userid: user._id, title: 'Creamy Hot Cocoa', desc: "A hot chocolate recipe that's old fashioned and comforting. It makes the kitchen smell wonderful and it's good for the soul.", vegornonveg: 'veg', ingredients: '¾ cup white sugar ⅓ cup unsweetened cocoa powder 1 pinch salt ⅓ cup boiling water 3 ½ cups milk ¾ teaspoon vanilla extract ½ cup half-and-half cream', instructions: 'Step 1\r\n' + 'Combine sugar, cocoa powder, and salt in a saucepan. Add boiling water and whisk until smooth. Bring mixture to a simmer and cook for 2 minutes. Stir constantly to prevent scorching.\r\n' + '\r\n' + 'Step 2\r\n' + 'Stir in 3 1/2 cups of milk and heat until very hot, but do not boil. Remove from heat; add vanilla.\r\n' + '\r\n' + 'Step 3\r\n' + 'Divide cocoa between 4 mugs. Add cream to each mug to cool cocoa to drinking temperature.', notes: '' },
        { image: { islink: true, url: 'https://images.unsplash.com/photo-1583064313642-a7c149480c7e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=715&q=80' }, userid: user._id, title: 'Best Lemonade Ever', desc: 'This lemonade recipe makes a very refreshing drink!', vegornonveg: 'veg', ingredients: '1 ¾ cups white sugar 1 cup water 9 medium lemons, or more as needed 7 cups ice-cold water ice as needed', instructions: 'Step 1\r\n' + 'Combine sugar and 1 cup water in a small saucepan. Stir to dissolve sugar while mixture comes to a boil. Set aside to cool slightly.\r\n' + '\r\n' + 'Step 2\r\n' + 'Meanwhile, roll lemons around on your counter to soften. Cut in half lengthwise, and squeeze into a liquid measuring cup. Add pulp to the juice, but discard any seeds. Continue juicing until you have 1 1/2 cups fresh juice and pulp. \r\n' + '\r\n' + 'Step 3\r\n' + 'Pour 7 cups ice-cold water into a pitcher. Stir in lemon juice and pulp, then add simple syrup to taste. Add ice.', notes: 'To make ahead, refrigerate cooled simple syrup for up to 1 month. Continue with Step 3 when ready to serve.\r\n' + '\r\n' + 'Nine medium lemons should yield about 1 1/2 cups juice and pulp, but the number required will depend on the size you use.', },
        { image: { islink: true, url: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80' }, userid: user._id, title: 'Broccoli Salad', desc: "This is a yummy summer broccoli salad that uses an interesting combination of fruits, vegetables, and meats. Before you decide you won't like it, try it. You'll be pleasantly surprised.", vegornonveg: 'veg', ingredients: '½ pound bacon 2 heads fresh broccoli 1 small red onion ¾ cup raisins ¾ cup sliced almonds 1 cup mayonnaise ½ cup white sugar 2 tablespoons white wine vinegar', instructions: 'Step 1\r\n' + 'Place bacon in a deep skillet and cook over medium-high heat until evenly brown, 7 to 10 minutes. Cool and crumble.\r\n' + '\r\n' + 'Step 2\r\n' + 'Cut the broccoli into bite-sized pieces and cut the onion into thin bite-sized slices. Combine with the bacon, raisins, and almonds and mix well.\r\n' + '\r\n' + 'Step 3\r\n' + 'To prepare the dressing, mix the mayonnaise, sugar, and vinegar together until smooth. Stir into the salad.\r\n' + '\r\n' + 'Step 4\r\n' + 'Let chill before serving, if desired.', notes: 'You can add an extra head of broccoli, if you like. You can use any nuts you prefer.', },
        { image: { islink: true, url: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=686&q=80' },  userid: user._id, title: 'Homestyle Potato Chips', desc: "Homemade potato chips are fun and easy. Guaranteed they won't last long! A food processor with a slicing attachment is very helpful for slicing the potatoes. Experiment with the thickness; you may like them thicker or thinner. I like to use olive oil for frying, but you can use safflower, corn, or peanut oil as well as vegetable oil.", vegornonveg: 'veg', ingredients: '4 medium potatoes, peeled and sliced paper-thin 3 tablespoons salt, plus more to taste 1 quart oil for deep frying', instructions: 'Step 1\r\n' + 'Transfer potato slices to a large bowl of cold water as you slice them.\r\n' + '\r\n' + 'Step 2\r\n' + 'Drain slices and rinse under cold water. Refill the bowl with water, add 3 tablespoons salt, and put slices back in the bowl. Let potatoes soak in the salty water for at least 30 minutes.\r\n' + '\r\n' + 'Step 3\r\n' + 'Drain and rinse slices again. Pat dry.\r\n' + '\r\n' + 'Step 4\r\n' + 'Heat oil in a deep-fryer to 365 degrees F (185 degrees C).\r\n' + '\r\n' + 'Step 5\r\n' + 'Working in small batches, fry potato slices until golden. Remove with a slotted spoon and drain on paper towels. Continue until all of the slices are fried.\r\n' + '\r\n' + 'Step 6\r\n' + 'Season potato chips with additional salt if desired.', notes: '', },
        { image: { islink: true, url: 'https://images.unsplash.com/photo-1549007953-2f2dc0b24019?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=735&q=80' },  userid: user._id, title: 'Strawberry Bruschetta', desc: 'This is a delicious variation of the popular tomato based appetizer. The strawberries are warm and sweet and the sugar is caramelized and crunchy! Your guests will love it!', vegornonveg: 'veg', ingredients: '24 slices French baguette 1 tablespoon butter, softened 2 cups chopped fresh strawberries ¼ cup white sugar, or as needed', instructions: 'Step 1\r\n' + "Preheat your oven's broiler. Spread a thin layer of butter on each slice of bread. Arrange bread slices in a single layer on a large baking sheet.\r\n" + '\r\n' + 'Step 2\r\n' + 'Place bread under the broiler for 1 to 2 minutes, just until lightly toasted. Spoon some chopped strawberries onto each piece of toast, then sprinkle sugar over the strawberries.\r\n' + '\r\n' + 'Step 3\r\n' + 'Place under the broiler again until sugar is caramelized, 3 to 5 minutes. Serve immediately.', notes: '', },
        { image: { islink: true, url: 'https://images.unsplash.com/photo-1569373744632-450af49756a9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80' }, userid: user._id, title: 'Sweet Grilled Corn', desc: 'A perfect summertime side dish of fresh sweet corn grilled in a savory herb mixture.', vegornonveg: 'veg', ingredients: '8 ears corn, husk and silk removed 1 ½ tablespoons macadamia nut oil ½ cup melted butter 2 tablespoons minced garlic 1 teaspoon crushed rosemary 1 teaspoon rubbed sage 1 teaspoon dried basil 1 teaspoon dried thyme leaves 1 ½ teaspoons salt 1 ½ teaspoons pepper ½ cup grated Parmesan cheese', instructions: 'Step 1\r\n' + 'Soak corn in cold water for 1 to 3 hours.\r\n' + '\r\n' + 'Step 2\r\n' + 'Stir together macadamia nut oil and melted butter in a bowl. Season with garlic, rosemary, sage, basil, thyme, salt, and pepper; stir in Parmesan cheese.\r\n' + '\r\n' + 'Step 3\r\n' + 'Drain corn and pat dry. Spread butter mixture evenly over each ear of corn, and place each piece on a square of aluminum foil. Tightly wrap each ear and puncture to allow excess steam to escape while grilling.\r\n' + '\r\n' + 'Step 4\r\n' + 'Preheat an outdoor grill for medium heat.\r\n' + '\r\n' + 'Step 5\r\n' + 'Grill the corn cobs until tender, about 20 to 30 minutes, turning frequently. Remove from the grill and check for doneness; if the corn is not done, continue cooking an additional 5 minutes.', notes: '', }
    ]
    await Recipe.create(dummy_data);
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
