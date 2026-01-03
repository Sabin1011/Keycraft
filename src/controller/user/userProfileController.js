const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const sendEmail = require("../../utils/sendEmail");
const Cart = require("../../models/cartModel");

const bcrypt = require("bcrypt");

const loadprofile = async (req, res) => {
  let cartCount = 0;
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.redirect("/login");
    }

    if (!user.referralCode) {
      const code = generateReferralCode();
      await User.findByIdAndUpdate(userId, { referralCode: code });
      user.referralCode = code;
    }

    //     if (userId) {
    //   const cart = await Cart.findOne({ userId });
    //   cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    // }

    const cart = await Cart.findOne({ userId });
    if (cart && cart.items) {
      cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    const returnUrl = "/profile";

    res.render("profile", {
      cartCount,
      returnUrl,
      user,
      success: req.session.successMessage,
      error: req.session.errorMessage,
    });
    delete req.session.successMessage;
    delete req.session.errorMessage;
  } catch (error) {
    console.log("error in the loading of user log", error);
  }
};

const loadChangePassword = async (req, res) => {
  try {
    res.render("changePassword", {
      user: req.session.user || req.user,
      errors: {},
    });
  } catch (error) {
    console.error("Error rendering change password page:", error);
    res.redirect("/profile");
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user?._id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User session expired. Please log in.",
      });
    }

    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    let hasError = false;

    if (!currentPassword || !currentPassword.trim()) {
      errors.currentPassword = "current password is required";
      hasError = true;
    }
    if (!newPassword || !newPassword.trim()) {
      errors.newPassword = "new password is required";
      hasError = true;
    }
    if (!confirmPassword || !confirmPassword.trim()) {
      errors.confirmPassword = "confirm password is required";
      hasError = true;
    }

    if (newPassword.length < 8) {
      errors.newPassword = "new password must be at least 8 characters long";
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "passwords do not match";
      hasError = true;
    }

    if (hasError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed. Please check the fields.",
        errors: errors,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User account not found." });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      errors.currentPassword = "current password is incorrect";
      return res.status(400).json({
        success: false,
        message: "Current password incorrect.",
        errors: errors,
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      errors.newPassword =
        "new password must be different from current password";
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the old one.",
        errors: errors,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    if (req.session.user) {
      req.session.user = user;
    }

    req.session.successMessage = "password changed successfully";

    return res.json({
      success: true,
      message: "Password Changed Successfully!",
      redirectUrl: "/profile",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

const loadAddAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).lean();

    const returnUrl = req.query.returnUrl || "/profile";

    res.render("addAddress", {
      user,
      address: null,
      mode: "add",
      returnUrl,
      error: req.session.errorMessage,
      success: req.session.successMessage,
    });

    delete req.session.errorMessage;
    delete req.session.successMessage;
  } catch (error) {
    console.error("Error loading add address:", error);
    res.redirect("/profile");
  }
};

const saveAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User session expired. Please log in again.",
      });
    }

    const { type, label, country, state, city, zipCode, street } = req.body;
    const errors = {};

    if (!type || type.trim().length < 2) {
      errors.type =
        "Address type (e.g., Home, Work) must be at least 2 characters.";
    }
    if (!street || street.trim().length < 5) {
      errors.street =
        "Street address is too short. Please include house number.";
    }
    if (!city || city.trim().length < 2) {
      errors.city = "Please enter a valid city.";
    }
    if (!state || state.trim().length < 2) {
      errors.state = "Please enter a valid state.";
    }
    if (!zipCode || !/^\d{5,6}$/.test(zipCode.trim())) {
      errors.zipCode = "Please enter a valid ZIP/PIN code (5 or 6 digits).";
    }
    if (!country || country.trim().length < 2) {
      errors.country = "Please enter a valid country.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: errors,
      });
    }

    const address = {
      type: type.trim(),
      label: label ? label.trim() : "",
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      zipCode: zipCode.trim(),
      street: street.trim(),
      isDefault: false,
    };

    const user = await User.findById(userId);

    if (!user.addresses || user.addresses.length === 0) {
      address.isDefault = true;
    }

    await User.findByIdAndUpdate(
      userId,
      { $push: { addresses: address } },
      { new: true }
    );

    const returnUrl = req.body.returnUrl || "/profile";
    return res.json({
      success: true,
      message: "Address added successfully!",
      redirectUrl: returnUrl,
    });

    req.session.successMessage = "Address added successfully";
    return res.redirect(returnUrl);
  } catch (error) {
    console.error("Error saving address:", error);
    req.session.errorMessage = "Failed to save address";

    const returnUrl = req.body.returnUrl || "/profile";
    return res.redirect(
      `/profile/address/add?returnUrl=${encodeURIComponent(returnUrl)}`
    );
  }
};

const loadEditAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const user = await User.findById(req.session.userId || req.user._id);
    const returnUrl = req.query.returnUrl || "/profile";

    if (!user) return res.redirect("/login");

    const address = user.addresses.id(addressId);
    if (!address) {
      req.session.errorMessage = "Address not found";
      return res.redirect(returnUrl);
    }

    res.render("editAddress", {
      address,
      user,
      mode: "edit",
      returnUrl,
      error: req.session.errorMessage,
      success: req.session.successMessage,
    });

    delete req.session.errorMessage;
    delete req.session.successMessage;
  } catch (error) {
    console.error("Error loading edit address:", error);
    req.session.errorMessage = "Something went wrong";
    res.redirect("/profile");
  }
};

const editAddressPatch = async (req, res) => {
  try {
    const addressId = req.params.id;

    const userId = req.session.userId;

    const returnUrl = req.body.returnUrl || "/profile";

    const { type, street, city, state, zipCode, country, label } = req.body;

    const errors = {};

    if (!type || type.trim().length < 2) {
      errors.type = "Address type must be at least 2 characters.";
    }
    if (!street || street.trim().length < 5) {
      errors.street =
        "Street address is too short. Please include house number.";
    }
    if (!city || city.trim().length < 2) {
      errors.city = "Please enter a valid city.";
    }
    if (!state || state.trim().length < 2) {
      errors.state = "Please enter a valid state.";
    }
    if (!zipCode || !/^\d{5,6}$/.test(zipCode.trim())) {
      errors.zipCode = "Please enter a valid ZIP code (5-6 digits).";
    }
    if (!country || country.trim().length < 2) {
      errors.country = "Please enter a valid country.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed. Please correct the highlighted errors.",
        errors: errors,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found or does not belong to user.",
      });
    }

    address.type = type.trim();
    address.street = street.trim();
    address.city = city.trim();
    address.state = state.trim();
    address.zipCode = zipCode.trim();
    address.country = country.trim();
    address.label = label ? label.trim() : "";

    await user.save();

    return res.json({
      success: true,
      message: "Address updated successfully!",
      redirectUrl: returnUrl,
    });
  } catch (error) {
    console.error("Error updating address:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update address due to a server error.",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { id: addressId } = req.params;
    const userId = req.session.userId;
    const returnUrl = req.query.returnUrl || "/profile";

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const index = user.addresses.findIndex(
      (a) => a._id.toString() === addressId
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const deleted = user.addresses[index];
    user.addresses.splice(index, 1);

    if (deleted.isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return res.json({
      success: true,
      message: "Address deleted successfully",
      redirectUrl: returnUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.userId || req.user._id;
    const returnUrl = req.body.returnUrl || "/profile";

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found. " });
    }

    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });

    const address = user.addresses.id(addressId);
    if (address) {
      address.isDefault = true;
      await user.save();

      return res.json({
        success: true,
        message: "Default address updated successfully.",
        newDefaultIt: addressId,
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Address not found." });
    }
  } catch (error) {
    console.error("Error setting default address:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update default address due to a server error.",
    });
  }
};

const selectAddress = async (req, res) => {
  try {
    const { addressId } = req.body;
    req.session.selectedAddressId = addressId;

    return res.json({
      success: true,
      message:"Address selected Successfully"
    })
  } catch (error) {
    console.error("Error selecting address:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to select address",
    });
  }
};

module.exports = {
  loadprofile,
  loadAddAddress,
  saveAddress,
  setDefaultAddress,
  loadChangePassword,
  changePassword,
  deleteAddress,
  loadEditAddress,
  editAddressPatch,
  selectAddress,
};
