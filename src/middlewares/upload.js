const multer = require("multer");

const storage = multer.memoryStorage(); // upload em buffer para o S3
const upload = multer({ storage });

module.exports = upload;
