const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");


// REGISTER
// ----------------
// ----------------


const loadRegister = async (req, res) => {
    try {
        res.render("register", {
            generalError: null,
            errors: {},
            oldInput: {},
            
        });
    } catch (error) {
        console.error("Error loading register page:", error);
        res.status(500).send("Server Error");
    }
};



const register = async (req, res) => {
    try {
        const { username, email, phone, password, confirm_password, agree } = req.body;

        let errors = {};
        
        if (!agree) {
            errors.agree = "You must agree to the privacy policy and terms.";
        }

        // 1. Username
        if (!username || username.trim().length < 3) {
            errors.username = "Enter a valid name (min 3 characters)";
        }

        // 2. Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            errors.email = "Enter a valid email address";
        }

        // 3. Phone number
        if (!phone || !/^\d{10}$/.test(phone)) {
            errors.phone = "Phone number must be exactly 10 digits";
        }

        // 4. Password strength
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!password) {
            errors.password = "Password is required";
        } else if (!passwordRegex.test(password)) {
            errors.password = "Password must be 8+ chars with 1 uppercase, 1 number, 1 special (@$!%*?&)";
        }

        // 5. Confirm password
        if (!confirm_password) {
            errors.confirmPassword = "Please confirm your password";
        } else if (password !== confirm_password) {
            errors.confirmPassword = "Passwords do not match";
        }

        // 6. Checkbox agreement
        if (!agree) {
            errors.agree = "You must agree to the privacy policy and terms of service";
        }

        // 7. Check if email already exists (only if no other errors)
        if (Object.keys(errors).length === 0) {
            const existingUser = await User.findOne({ 
                email: email.toLowerCase() 
            });

            if (existingUser) {
                errors.email = "This email is already registered. Please log in.";
            }
        }

        // If any error → send back to form with errors + old input
        if (Object.keys(errors).length > 0) {
            return res.render("register", {
                generalError: null,        
                errors,
                oldInput: req.body,                    
                // oldInput: {
                //     username: username?.trim() || '',
                //     email: email || '',
                //     phone: phone || ''
                // }
            });
        }

        // All validation passed → proceed
        const hashedPassword = await bcrypt.hash(password, 12);

        const regUser = {
            username: username.trim(),
            email: email.toLowerCase(),
            phone,
            password: hashedPassword
        };

        // Store in session for OTP verification
        const otp = generateOTP();
        req.session.sendedOtp = otp;
        req.session.user = regUser;

        console.log("OTP generated:", otp);

        return res.redirect("/otp");

    } catch (error) {
        console.error("Registration error:", error);
        return res.render("register", {
            generalError: "Something went wrong. Please try again later.",
            errors: {},
            oldInput: {
                username: req.body.username || '',
                email: req.body.email || '',
                phone: req.body.phone || ''
            }
        });
    }
};

// OTP 
// --------------------
// --------------------

function generateOTP() {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString(); 
}

// REGISTER OTP

const loadOtp = async(req, res)=>{
    try{
        res.render("Otp",{
            error:null,
        });
    }catch(error){
        console.log("error rendering otp page", error)
    }
}


const verifyOtp = async(req, res)=>{
    try{

        let regUser = req.session.user;
        let sendedOtp = req.session.sendedOtp;
        const { otp } = req.body;

        if(sendedOtp!=otp){
            console.log("wrong otp : ", otp)

            
            return res.render("Otp", {
                error:"Incorrect Otp. Try entering again ",
            })
        }
        console.log("otp entered successfully")



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


// resend otp

const resendOtp = async(req, res)=>{
    try {
        
    } catch (error) {
        console.log("Error: ",error)
    }
}

// LOGIN
// ----------------
// ----------------

const loadLogin = async(req, res)=>{
    try{
        res.render("login", {message: null, email:"",emailError: null, passwordError: null });
    }catch(error){
        console.log("Error loading login page:", error);
        res.status(500).send("Internal Server Error");
    }
}


const login = async(req, res)=>{
    try{
        
        const {email, password} = req.body;
         

        let emailError = "";
        let passwordError = "";

        // backend validation
        if(!email|| !password) {
            return res.render("login",{
                message:"All fields are required",
                passwordError: "",
                emailError:"",
                email
            });
        };

        // custom email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            return res.render("login",{
                emailError:"Enter a valid email address",
                passwordError: "",
                message:"",
                email
            });
        };


        // custom password validation
        if(password.leght < 6){
            return res.render("login",{
                passwordError:"Password must be at least 6 characters",
                emailError:"",
                message:"",
                email
            });
        }


        // find user 
        const user = await User.findOne({email, status:true});

        if(!user){
            return res.render("login",{
                email, 
                message:"user not found",
                passwordError: "",
                emailError:""
            })
        }
        
        // checks password (hashed)
        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch) {
            return res.render("login",{
                email,
                message:"",
                emailError:"",
                passwordError: "Incorrect Password"
                
            });
        }

        // check if user is blocked / inactive 
        if(user.isBlocked){
            return res.render("login",{
                email, 
                emailError:"",
                passwordError: "",
                message:"your account is blocked"
            });
        };

        // check if user is admin or not
        if(user.isAdmin === true) {
            req.sesison.adminId = user._id;
            return res.render("login")
        }

        // create session
        req.session.userId = user._id;

        return res.redirect("/home")
    }
    catch(error){
        console.log("Login error:", error);
        res.status(500).send("Internal Server Error");
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
    resendOtp,
    


}