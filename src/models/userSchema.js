const mongoose = require('mongoose')
const {Schema} = mongoose;

const userSchema = new Schema(
    {
        username:{
            type: String,
            required: true,
        },
        email: {
            type: String, 
            required: true, 
            unique: true,
            default: null
        },
        phone:{
            type: String, 
            requierd: false,
            unique: false,
            default: null
        },
        password: {
            type: String,
            required: false
        },
        status: {
            type: Boolean,
            default: true
        },
        isAdmin: {
            type: Boolean,
            default: false
        },
        googleId:{
            type: String,
        }
    },
    
    {timestamps: true}
)

const User = mongoose.model("User", userSchema);
module.exports = User;