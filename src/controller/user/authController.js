const User = require("../../models/userSchema");
const sendEmail = require("../../utils/sendEmail");
const bcrypt = require("bcrypt");
const Wallet = require("../../models/walletSchema");
const generateReferralCode = require("../../utils/generateReferralCode");

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
    const {
      username,
      email,
      phone,
      password,
      confirm_password,
      agree,
      referralCode,
    } = req.body;

    req.session.referralCode = referralCode?.trim().toUpperCase() || null;
    let errors = {};

    if (!agree) {
      errors.agree = "You must agree to the privacy policy and terms.";
    }

    if (!username || username.trim().length < 3) {
      errors.username = "Enter a valid name (min 3 characters)";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.email = "Enter a valid email address";
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
      errors.phone = "Phone number must be exactly 10 digits";
    }

    const cleanPassword = password?.trim();
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!cleanPassword) {
      errors.password = "Password is required";
    } else if (!passwordRegex.test(cleanPassword)) {
      errors.password =
        "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character";
    }

    if (!confirm_password) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirm_password) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!agree) {
      errors.agree =
        "You must agree to the privacy policy and terms of service";
    }

    if (Object.keys(errors).length === 0) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingUser) {
        errors.email = "This email is already registered. Please log in.";
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.render("register", {
        generalError: null,
        errors,
        oldInput: req.body,
      });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 12);

    const regUser = {
      username: username.trim(),
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
    };

    const otp = generateOTP();

    await sendEmail({
      to: email,
      subject: "Your New OTP",
      text: `Your new OTP is: ${otp}`,
    });

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
        username: req.body.username || "",
        email: req.body.email || "",
        phone: req.body.phone || "",
      },
    });
  }
};  

function generateOTP() {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString();
}


const loadOtp = async (req, res) => {
  try {
    res.render("Otp", {
      error: null,
    });
  } catch (error) {
    console.log("error rendering otp page", error);
  }
};

// const verifyOtp = async (req, res) => {
//   try {
//     let regUser = req.session.user;
//     let sendedOtp = req.session.sendedOtp;
//     const { otp } = req.body;

//     if (sendedOtp != otp) {
//       console.log("wrong otp : ", otp);

//       return res.render("Otp", {
//         error: "Incorrect Otp. Try entering again ",
//       });
//     }
//     console.log("otp entered successfully");

//     const newUser = new User({
//       username: regUser.username,
//       email: regUser.email,
//       phone: regUser.phone,
//       password: regUser.password,
//       referralCode: generateReferralCode(),
//     });

//     let referrer = null;
//     if (req.session.referralCode) {
//       referrer = await User.findOne({
//         referralCode: req.session.referralCode,
//       });
//       if (referrer) {
//         newUser.referredBy = referrer._id;
//       }
//     }

//     await newUser.save();

//     await Wallet.create({
//       userId: newUser._id,
//       balance: 0,
//       transactions: [],
//     });

//     if (referrer) {
//       await Wallet.findOneAndUpdate(
//         { userId: referrer._id },
//         {
//           $inc: { balance: 200 },
//           $push: {
//             transactions: {
//               amount: 200,
//               type: "credit",
//               reason: "Referral reward",
//             },
//           },
//         },
//         { upsert: true }
//       );

//       await Wallet.findOneAndUpdate(
//         { userId: newUser._id },
//         {
//           $inc: { balance: 50 },
//           $push: {
//             transactions: {
//               amount: 50,
//               type: "credit",
//               reason: "Signup referral bonus",
//             },
//           },
//         }
//       );

//       newUser.referralRewarded = true;
//       await newUser.save();
//     }

//     req.session.sendedOtp = null;
//     req.session.user = null;
//     req.session.referralCode = null;

//     return res.redirect("/login");
//   } catch (error) {}
// };

const verifyOtp = async (req, res) => {
  try {
    const regUser = req.session.user;
    const sendedOtp = req.session.sendedOtp;
    const otpExpiry = req.session.otpExpiry;
    const { otp } = req.body;

    if (!regUser || !sendedOtp) {
      return res.redirect("/register");
    }

    if (!otpExpiry || Date.now() > otpExpiry) {
      return res.render("Otp", {
        error: "OTP has expired. Please resend OTP.",
        remainingTime: 0,
      });
    }

    if (String(sendedOtp) !== String(otp)) {
      const remainingTime = Math.max(
        0,
        Math.floor((otpExpiry - Date.now()) / 1000)
      );

      return res.render("Otp", {
        error: "Incorrect OTP. Please try again.",
        remainingTime,
      });
    }

    console.log("OTP verified successfully");

    const newUser = new User({
      username: regUser.username,
      email: regUser.email,
      phone: regUser.phone,
      password: regUser.password,
      referralCode: generateReferralCode(),
    });

    let referrer = null;

    if (req.session.referralCode) {
      referrer = await User.findOne({
        referralCode: req.session.referralCode,
      });
      if (referrer) {
        newUser.referredBy = referrer._id;
      }
    }

    await newUser.save();

    await Wallet.create({
      userId: newUser._id,
      balance: 0,
      transactions: [],
    });

    if (referrer) {
      await Wallet.findOneAndUpdate(
        { userId: referrer._id },
        {
          $inc: { balance: 200 },
          $push: {
            transactions: {
              amount: 200,
              type: "credit",
              reason: "Referral reward",
            },
          },
        },
        { upsert: true }
      );

      await Wallet.findOneAndUpdate(
        { userId: newUser._id },
        {
          $inc: { balance: 50 },
          $push: {
            transactions: {
              amount: 50,
              type: "credit",
              reason: "Signup referral bonus",
            },
          },
        }
      );

      newUser.referralRewarded = true;
      await newUser.save();
    }

    req.session.sendedOtp = null;
    req.session.otpExpiry = null;
    req.session.user = null;
    req.session.referralCode = null;

    return res.redirect("/login");
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.redirect("/register");
  }
};

const resendOtp = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect("/register");
    }

    if (req.session.otpExpiry && Date.now() < req.session.otpExpiry) {
      return res.redirect("/otp");
    }

    const newOtp = generateOTP();

    req.session.sendedOtp = newOtp;
    req.session.otpExpiry = Date.now() + 1 * 60 * 1000; 

    await sendEmail({
      to: user.email,
      subject: "Your New OTP",
      text: `Your new OTP is: ${newOtp}`,
    });

    return res.redirect("/otp");
  } catch (error) {
    console.log("Error: ", error);
  }
};

// LOGIN

const loadLogin = async (req, res) => {
  try {
    res.render("login", {
      message: null,
      email: "",
      emailError: null,
      passwordError: null,
    });
  } catch (error) {
    console.log("Error loading login page:", error);
    res.status(500).send("Internal Server Error");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let emailError = "";
    let passwordError = "";

    if (!email || !password) {
      return res.render("login", {
        message: "All fields are required",
        passwordError: "",
        emailError: "",
        email,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render("login", {
        emailError: "Enter a valid email address",
        passwordError: "",
        message: "",
        email,
      });
    }

    if (password.length < 6) {
      return res.render("login", {
        passwordError: "Password must be at least 6 characters",
        emailError: "",
        message: "",
        email,
      });
    }

    const user = await User.findOne({ email, status: true });

    if (!user) {
      return res.render("login", {
        email,
        message: "user not found",
        passwordError: "",
        emailError: "",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        email,
        message: "",
        emailError: "",
        passwordError: "Incorrect Password",
      });
    }

    if (user.isBlocked) {
      return res.render("login", {
        email,
        emailError: "",
        passwordError: "",
        message: "your account is blocked",
      });
    }

    if (user.isAdmin === true) {
      req.sesison.adminId = user._id;
      return res.render("login");
    }

    req.session.userId = user._id;

    return res.redirect("/");
  } catch (error) {
    console.log("Login error:", error);
    res.status(500).send("Internal Server Error");
  }
};

// FORGOT PASSWORD

const loadForgotPassword = async (req, res) => {
  try {
    res.render("forgotPassword", { error: null });
  } catch (error) {
    console.log("error loading forgot password page", error);
  }
};

const emailVerification = async (req, res) => {
  try {
    const email = req.body.email?.trim();

    if (!email) {
      return res.render("forgotPassword", {
        error: "Please enter your email address.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("forgotPassword", {
        error: "No account found with this email.",
      });
    }

    const otp = generateOTP();

    req.session.forgotOtp = otp;
    req.session.forgotEmail = email;
    req.session.otpExpiry = Date.now() + 5 * 60 * 1000;

    await sendEmail({
      to: req.session.forgotEmail,
      subject: "Password Reset OTP - KeyCraft",
      text: `Your OTP for password reset is: ${otp}\nIt expires in 5 minutes.`,
    });

    console.log("Forgot Password OTP Sent:", otp, "to", email);

    return res.redirect("/forgot-password/otp");
  } catch (error) {
    console.log("Error in forgot password OTP send:", error);
    return res.render("forgotPassword", {
      error: "Failed to send OTP. Try again later.",
    });
  }
};

const loadforgototp = async (req, res) => {
  try {
    if (!req.session.forgotEmail || !req.session.forgotOtp) {
      req.flash("error", "Session expired. Please try again.");
      return res.redirect("/forgotPassword");
    }

    if (req.session.otpExpiry && Date.now() > req.session.otpExpiry) {
      delete req.session.forgotOtp;
      delete req.session.forgotEmail;
      delete req.session.otpExpiry;
      req.flash("error", "OTP expired. Please request a new one.");
      return res.redirect("/forgot-password");
    }

    res.render("forgotpasswordotp", {
      email: req.session.forgotEmail,
      error: req.flash("error")[0] || null,
    });
  } catch (error) {
    console.log("Error loading forgot OTP page:", error);
    res.redirect("/forgot-password");
  }
};

const loadEnterNewPassword = async (req, res) => {
  try {
    res.render("forgotNewPassword");
  } catch (error) {
    console.log("error rendering the page ", error);
  }
};

const verifyForgotOtp = async (req, res) => {
  try {
    console.log("reached verifyforgototp");
    const { otp } = req.body;
    const email = req.session.forgotEmail;

    if (!email || !req.session.forgotOtp) {
      req.flash("error", "Invalid session. Try again.");
      return res.redirect("/forgot-password");
    }

    if (Date.now() > req.session.otpExpiry) {
      req.flash("error", "OTP has expired.");
      return res.redirect("/forgot-password");
    }

    if (otp !== req.session.forgotOtp) {
      req.flash("error", "Invalid OTP. Please try again.");
      return res.redirect("/forgot-password/verify-otp");
    }

    delete req.session.forgotOtp;
    delete req.session.otpExpiry;

    req.session.canResetPassword = true;

    res.render("forgotNewPassword", { email });
  } catch (error) {
    console.log(error);
    req.flash("error", "Something went wrong.");
    res.redirect("/forgot-password");
  }
};

const forgotPasswordOtpPage = (req, res) => {
  try {
    return res.render("forgotPasswordOtp", {
      email: req.session.forgotEmail,
      error: "",
    });
  } catch (error) {}
};

const resendForgotPasswordOtp = async (req, res) => {
  try {
    const email = req.session.forgotEmail;

    if (!email) {
      return res.redirect("/forgot-password");
    }

    if (req.session.otpExpiry && Date.now() < req.session.otpExpiry) {
      return res.redirect("/forgot-password/otp");
    }

    const newOtp = generateOTP();

    req.session.forgotOtp = newOtp;
    req.session.otpExpiry = Date.now() + 1 * 60 * 1000; 

    await sendEmail({
      to: email,
      subject: "Reset Password OTP - KeyCraft",
      text: `Your OTP is: ${newOtp}`,
    });

    console.log("Forgot password OTP resent:", newOtp);

    return res.redirect("/forgot-password/otp");
  } catch (error) {
    console.error("Resend forgot OTP error:", error);
    return res.redirect("/forgot-password");
  }
};


const resetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).render("resetPassword", {
        error: "All fields are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render("resetPassword", {
        error: "Passwords do not match.",
      });
    }

    if (password.length < 8) {
      return res.status(400).render("resetPassword", {
        error: "Password must be at least 8 characters.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).render("resetPassword", {
        error: "User not found.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    await user.save();

    return res.redirect("/login");
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).render("resetPassword", {
      error: "Something went wrong. Please try again.",
    });
  }
};

module.exports = {
  resendForgotPasswordOtp,
  loadRegister,
  register,
  loadOtp,
  verifyOtp,
  loadLogin,
  login,
  loadForgotPassword,
  loadEnterNewPassword,
  resendOtp,
  emailVerification,
  loadforgototp,
  verifyForgotOtp,
  forgotPasswordOtpPage,
  resetPassword,
};
