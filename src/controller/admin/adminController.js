const User = require('../../models/userSchema')
const bcrypt = require("bcrypt");


// ADMIN LOGIN PAGE


const loadLogin = async(req,res)=>{
    try{
        res.render("adminLogin");
    } catch(error){
        console.log("error loading login page : ", error)
    }
}

const adminlogin = async(req, res)=>{
    try{
        const {email, password } = req.body;

        const admin = await User.findOne({email, isAdmin: true});
        console.log(admin)

        if(!admin){
            res.redirect("/admin/login");
        };
        
            let isMatch = await bcrypt.compare(password, admin.password)
            console.log(isMatch)

        if(!isMatch){
            res.redirect("/admin/login")
        }

        res.redirect("/admin/category")

    }catch(error){

    }
}




module.exports = {
    loadLogin,
    adminlogin
}