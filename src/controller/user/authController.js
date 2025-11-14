const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");


// REGISTER

const loadRegister = async (req, res)=>{
    try{
        return res.render("register");
    }catch(error){
        console.log("error rendering signup page", error);
    }
};

function generateOTP() {
  // Generate a random number between 100,000 (inclusive) and 999,999 (inclusive)
  // This ensures the number is always 6 digits long.
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString(); // Convert to string to handle potential leading zeros if displayed
}

const register = async(req, res)=>{
    try{
        const { username, email, phone, password, confirm_password} = req.body;
        
        // if(password !== confirm_password){
        //     return res.render("register",{ message: "Password do not match" });
        // }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const regUser = {
            username:username,
            email:email,
            phone:phone,    
            password: hashedPassword,
            
        }
        
        let sendedOtp = generateOTP();
       
        req.session.sendedOtp = sendedOtp;
        console.log("Otp send : ",sendedOtp)
        req.session.user = regUser;


        // await newUser.save();

        return res.redirect("/otp")
    }
    catch(error){
        console.log("Error registering user:", error);
        res.render("register", {messgae: "registration failed. Try again."} )
    }
}

// REGISTER OTP
const loadOtp = async(req, res)=>{
    try{
        res.render("Otp");
    }catch(error){
        console.log("error rendering otp page", error)
    }
}


const verifyOtp = async(req, res)=>{
    try{

        let regUser = req.session.regUser;
        let sendedOtp = req.session.sendedOtp;
        const { otp } = req.body;

        if(sendedOtp!=otp){
            console.log(otp)
            return res.redirect("/otp")
        }
        console.log("hello")



        const newUser = new User({
            username:regUser.username,
            email:regUser.email,
            phone:regUser.phone,
            password:regUser.password,
            
        })
        await newUser.save();
        // const user = await User.findOne({ email });
        // if(!user){
        //     return res.render("Otp",{email, messge:"user not found"})
        // }


       return res.redirect("/login")
    }catch(error){
        
    }
}


// LOGIN

const loadLogin = async(req, res)=>{
    try{
        res.render("login")
    }catch(error){
        console.log("error rendering login page", error)
    }
}


const login = async(req, res)=>{
    try{
        
        const {email, password} = req.body;
         
        const user = await User.findOne({email});
        if(!user){
            return res.render("login",{email, message:"user not found"})
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log("hello ismatch",isMatch)

        if(!isMatch) {
            return res.render("login",{message: "Invalid credentials"});
        }

        req.session.userId = user._id;
        return res.redirect("/home")
    }
    catch(error){
        
    }

}

// FORGOT PASSWORD 

const loadForgotPassword = async(req, res)=>{
    try{
        res.render("forgotPassword")
    } catch(error){
        console.log("error loading forgot password page", error)
    }
}

// FORGOT ENTER NEW PASSWORD

const loadEnterNewPassword = async(req, res)=>{
    try{
        res.render("forgotNewPassword");
    } catch(error){
        console.log("error rendering the page ", error)
    }
}






module.exports = {
    loadRegister,
    register,
    loadOtp,
    verifyOtp,
    loadLogin,
    login,
    loadForgotPassword,
    loadEnterNewPassword,


}