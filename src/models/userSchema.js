const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema({
  type: { type: String, required: true },
  label: { type: String },

  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  zipCode: { type: String, required: true },

  street: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      default: null,
    },
    phone: {
      type: String,
      requierd: false,
      unique: false,
      default: null,
    },
    password: {
      type: String,
      required: false,
    },
    referralCode: {
      type: String,
      unique: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    referralRewarded: {
      type: Boolean,
      default: false,
    },

    status: {
      type: Boolean,
      default: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
    },
    profileImage: {
      type: String,
      default: "/images/default-avatar.jpg",
    },
    addresses: [addressSchema],
  },

  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
