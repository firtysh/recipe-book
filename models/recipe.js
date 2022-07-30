const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const recipeSchema = new Schema({
    userid: {
        type: String,
        required: true
    },
    title : {
        type: String,
        required: true
    },
    desc: {
        type: String,
        required: true
    },
    vegornonveg: {
        type: String,
        enum: ["veg","nonveg"],
        required: true
    },
    ingredients : {
        type: String,
        required: true
    },
    instructions : {
        type: String,
        required: true
    },
    notes : {
        type: String,
    },
    image : {
        islink: {
            type: Boolean,
            required: true
        },
        url: {
            type: String,
            required: true
        },
    }
},{timestamps:true});

const Recipe = mongoose.model("Recipe", recipeSchema);
module.exports = Recipe;