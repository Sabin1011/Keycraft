const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const sendEmail = require("../../utils/sendEmail");

const bcrypt = require("bcrypt");

const loadEditProfilePage = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.redirect("/login");
    }

    res.render("editProfile", {
      user: user,
      error: req.session.errorMessage || undefined,
      success: req.session.successMessage || undefined,
    });

    delete req.session.errorMessage;
    delete req.session.successMessage;
  } catch (error) {
    console.error("Error rendering edit profile page:", error);
    res.redirect("/profile");
  }
};

const sendEmailOTP = async (req, newEmail) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.emailChangeOTP = otp;
    req.session.newEmail = newEmail;
    req.session.otpExpiry = Date.now() + 10 * 60 * 1000;

    const emailSent = await sendEmail({
      to: newEmail,
      subject: "Email Verification OTP",
      html: `<p>Hello,</p>
             <p>Your OTP for verifying your email is: <b>${otp}</b></p>
             <p>This OTP is valid for 10 minutes.</p>`,
    });

    return emailSent;
  } catch (err) {
    console.error("Error sending OTP email:", err);
    return false;
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, email, phone, croppedImage } = req.body;
    const userId = req.session.user?._id || req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect("/login");
    }

    if (!username || !email) {
      req.session.errorMessage = "name and email are required";
      return res.redirect("/profile/edit");
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone ? phone.trim() : "";

    if (!trimmedUsername || !trimmedEmail) {
      req.session.errorMessage = "name and email cannot be empty";
      return res.redirect("/profile/edit");
    }

    if (trimmedUsername.length < 2) {
      req.session.errorMessage = "name must be at least 2 characters long";
      return res.redirect("/profile/edit");
    }

    if (trimmedUsername.length > 50) {
      req.session.errorMessage = "name cannot exceed 50 characters";
      return res.redirect("/profile/edit");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      req.session.errorMessage = "please enter a valid email address";
      return res.redirect("/profile/edit");
    }

    if (trimmedPhone) {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (!phoneRegex.test(trimmedPhone)) {
        req.session.errorMessage = "please enter a valid phone number";
        return res.redirect("/profile/edit");
      }

      if (trimmedPhone.replace(/[\s\+\-\(\)]/g, "").length < 10) {
        req.session.errorMessage = "phone number must be at least 10 digits";
        return res.redirect("/profile/edit");
      }
    }
    const emailChanged = trimmedEmail !== user.email;

    if (emailChanged) {
      const otpSent = await sendEmailOTP(req, trimmedEmail);
      if (!otpSent) {
        req.session.errorMessage = "Failed to send OTP. Try again.";
        return res.redirect("/profile/edit");
      }

      req.session.pendingProfileUpdate = {
        username: username.trim(),
        phone: phone ? phone.trim() : "",
        profileImage: croppedImage || null,
      };

      return res.redirect("/profile/edit-profile/verify-otp");
    }

    let profileImagePath = user.profileImage;

    if (croppedImage) {
      try {
        if (!croppedImage.startsWith("data:image/")) {
          req.session.errorMessage = "invalid image format";
          return res.redirect("/profile/edit");
        }

        const base64Length = croppedImage.length;
        const fileSizeInMB = (base64Length * 0.75) / (1024 * 1024);

        if (fileSizeInMB > 5) {
          req.session.errorMessage = "image size must be less than 5MB";
          return res.redirect("/profile/edit");
        }

        const uploadsDir = path.join(
          __dirname,
          "../../../public/uploads/profiles"
        );
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        if (
          user.profileImage &&
          user.profileImage !== "/images/default-avatar.jpg"
        ) {
          let imagePath = user.profileImage;

          if (imagePath.startsWith("/")) {
            imagePath = imagePath.slice(1);
          }

          const oldImagePath = path.join(__dirname, "../public", imagePath);

          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log("Old image deleted:", oldImagePath);
          } else {
            console.log("Old image not found:", oldImagePath);
          }
        }

        const base64Data = croppedImage.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const filename = `profile-${userId}-${Date.now()}.jpg`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, buffer);
        profileImagePath = `/uploads/profiles/${filename}`;
      } catch (imageError) {
        console.error("Error saving image:", imageError);
        req.session.errorMessage = "failed to upload image. please try again";
        return res.redirect("/profile/edit");
      }
    }

    user.username = trimmedUsername;
    user.email = trimmedEmail;
    user.phone = trimmedPhone;
    user.profileImage = profileImagePath;

    await user.save();

    if (req.session.user) {
      req.session.user = user;
    }

    req.session.successMessage = "profile updated successfully";
    res.redirect("/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    req.session.errorMessage =
      "an error occurred while updating profile. please try again";
    res.redirect("/profile/edit");
  }
};

const loadEmailOTPPage = (req, res) => {
  const otp = req.session.emailChangeOTP;
  console.log("Generated OTP:", otp);
  if (!req.session.newEmail) return res.redirect("/profile/edit");

  res.render("changeEmailOtp", {
    error: req.session.errorMessage,
    newEmail: req.session.newEmail,
    otp: req.session.emailChangeOTP,
  });

  delete req.session.errorMessage;
};

const verifyEmailOTP = async (req, res) => {
  const { otp } = req.body;

  if (!req.session.emailChangeOTP || !req.session.newEmail) {
    req.session.errorMessage = "OTP session expired. Try again.";
    return res.redirect("/profile/edit");
  }

  if (Date.now() > req.session.otpExpiry) {
    req.session.errorMessage = "OTP expired. Try again.";
    return res.redirect("/profile/edit");
  }

  if (otp !== req.session.emailChangeOTP) {
    req.session.errorMessage = "Invalid OTP. Please try again.";
    return res.redirect("/profile/edit-profile/verify-otp");
  }

  const userId = req.session.user?._id || req.user?._id;
  const user = await User.findById(userId);
  if (!user) return res.redirect("/login");

  user.email = req.session.newEmail;

  if (req.session.pendingProfileUpdate) {
    const { username, phone, profileImage } = req.session.pendingProfileUpdate;
    user.username = username || user.username;
    user.phone = phone || user.phone;
    if (profileImage) user.profileImage = profileImage;
  }

  await user.save();

  req.session.user = user;

  delete req.session.emailChangeOTP;
  delete req.session.newEmail;
  delete req.session.otpExpiry;
  delete req.session.pendingProfileUpdate;

  req.session.successMessage =
    "Email verified and profile updated successfully";
  res.redirect("/profile");
};

module.exports = {
  loadEditProfilePage,
  updateProfile,
  loadEmailOTPPage,
  verifyEmailOTP,
  sendEmailOTP,
};
