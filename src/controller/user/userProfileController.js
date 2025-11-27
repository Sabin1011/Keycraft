const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const sendEmail = require("../../utils/sendEmail");

const bcrypt = require("bcrypt");



const loadprofile = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.redirect("/login");
    }

    res.render("profile", { 
        user,
        success: req.session.successMessage,
        error: req.session.errorMessage
    });
    delete req.session.successMessage;
    delete req.session.errorMessage;

  } catch (error) {}
};

const loadAddAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = User.findById(userId).lean();

    res.render("addAddress", { user });
  } catch (error) {}
};

const saveAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const { type, label, country, state, city, zipCode, street } = req.body;

    const address = {
      type,
      label,
      country,
      state,
      city,
      zipCode,
      street,
    };

    await User.findByIdAndUpdate(
      userId,
      { $push: { addresses: address } },
      { new: true }
    );
    return res.redirect("/profile");
  } catch (error) {}
};

const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;

    const user = await User.findById(userId);

    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });

    const target = user.addresses.id(addressId);

    if (!target) {
      console.log("Address not found");
      return res.redirect("/profile");
    }
    target.isDefault = true;

    console.log(target);
    await user.save();

    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.redirect("/profile");
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

    if (hasError) {
      return res.render("changePassword", {
        errors,
        user: req.session.user || req.user,
      });
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
      return res.render("changePassword", {
        errors,
        user: req.session.user || req.user,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      errors.currentPassword = "user not found";
      return res.render("changePassword", {
        errors,
        user: req.session.user || req.user,
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      errors.currentPassword = "current password is incorrect";
      return res.render("changePassword", {
        errors,
        user: req.session.user || req.user,
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      errors.newPassword =
        "new password must be different from current password";
      return res.render("changePassword", {
        errors,
        user: req.session.user || req.user,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    if (req.session.user) {
      req.session.user = user;
    }

    req.session.successMessage = "password changed successfully";

    return res.redirect("/profile");
  } catch (error) {
    console.error("Error changing password:", error);
    return res.render("changePassword", {
      errors: { general: "an error occurred, please try again" },
      user: req.session.user || req.user,
    });
  }
};


const deleteAddress = async(req, res)=>{
  try {
    const addressId = req.params.id;
    const userId = req.session.user._id || req.user._id;

    const user = await User.findById(userId);

    if(!user) {
        req.session.errorMessage = 'User not found';
        return res.redirect('/profile');
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);

    if(addressIndex === -1){
        req.session.errorMessage = 'Address not found';
        return res.redirect('/profile');
    }

    const  deletedAddress = user.addresses[addressIndex];
    user.addresses.splice(addressIndex, 1);

    if(deletedAddress.isDefault && user.addresses.length> 0){
        user.addresses[0].isDefault = true;
    }
    await user.save();

    req.session.successMessage = 'Address deleted successfully';
    res.redirect('/profile');
  } catch (error) {
    console.error('Error deleting address:', error);
    req.session.errorMessage = 'Failed to delete address';
    res.redirect('/profile');
  }
}


const loadEditAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const user = await User.findById(req.session.user._id || req.user._id);

    if (!user) return res.redirect('/login');

    const address = user.addresses.id(addressId);
    if (!address) {
      req.session.errorMessage = 'Address not found';
      return res.redirect('/profile');
    }

    res.render('editAddress', {
      address,
      user,
      error: req.session.errorMessage,
      success: req.session.successMessage
    });

    // Clear messages
    delete req.session.errorMessage;
    delete req.session.successMessage;

  } catch (error) {
    console.error('Error loading edit address:', error);
    req.session.errorMessage = 'Something went wrong';
    res.redirect('/profile');
  }
};

const editAddressPost = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user._id || req.user._id;

    const { type, street, city, state, zipCode, country } = req.body;

    // Validation
    if (!type || type.trim().length < 2) {
      req.session.errorMessage = 'Address type must be at least 2 characters';
      return res.redirect(`/profile/address/${addressId}/edit`);
    }
    if (!street || street.trim().length < 5) {
      req.session.errorMessage = 'Street address is too short';
      return res.redirect(`/profile/address/${addressId}/edit`);
    }
    if (!city || city.trim().length < 2) {
      req.session.errorMessage = 'Please enter a valid city';
      return res.redirect(`/profile/address/${addressId}/edit`);
    }
    if (!state || state.trim().length < 2) {
      req.session.errorMessage = 'Please enter a valid state';
      return res.redirect(`/profile/address/${addressId}/edit`);
    }
    if (!zipCode || !/^\d{5,6}$/.test(zipCode.trim())) {
      req.session.errorMessage = 'Please enter a valid ZIP code (5-6 digits)';
      return res.redirect(`/profile/address/${addressId}/edit`);
    }
    if (!country || country.trim().length < 2) {
      req.session.errorMessage = 'Please enter a valid country';
      return res.redirect(`/profile/address/${addressId}/edit`);
    }

    const user = await User.findById(userId);
    const address = user.addresses.id(addressId);

    if (!address) {
      req.session.errorMessage = 'Address not found';
      return res.redirect('/profile');
    }

    // Update fields
    address.type = type.trim();
    address.street = street.trim();
    address.city = city.trim();
    address.state = state.trim();
    address.zipCode = zipCode.trim();
    address.country = country.trim();

    await user.save();

    req.session.successMessage = 'Address updated successfully';
    res.redirect('/profile');

  } catch (error) {
    console.error('Error updating address:', error);
    req.session.errorMessage = 'Failed to update address';
    res.redirect(`/profile/address/${req.params.id}/edit`);
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
  editAddressPost

};