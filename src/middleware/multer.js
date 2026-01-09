
const multer = require("multer");

const path = require("path");

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


const profileUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});



module.exports = {
  upload,
  profileUpload,
};