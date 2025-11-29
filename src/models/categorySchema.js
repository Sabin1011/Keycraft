const mongoose = require('mongoose')
const { Schema } = mongoose;


const categorySchema = new Schema({
        // yet to complete.......!
    name:{    
        type:String,
        required:true,
        unique:true,
        trim:true,
    },
    description:{
        type:String,
        required:true,

    },
    status:{
        type:Boolean,
        default:true,
    },
    
},{timestamps:true});

const Category = mongoose.model("categories", categorySchema);
module.exports = Category;