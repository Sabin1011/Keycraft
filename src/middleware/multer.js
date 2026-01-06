// Your Multer – CORRECT & SECURE
const multer = require("multer");

const path = require("path");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, "../../public/uploads/products"));
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, uniqueName + path.extname(file.originalname));
//   },
// });

const storage = multer.memoryStorage();


const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  cb(null, ext && mime);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});



// const profileStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, "../../public/uploads/profiles"));
//   },
//   filename: (req, file, cb) => {
//     const unique = "profile-" + Date.now();
//     cb(null, unique + path.extname(file.originalname));
//   },
// });

const profileUpload = multer({
  storage,
  // storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});



module.exports = {
  upload,
  profileUpload,
};