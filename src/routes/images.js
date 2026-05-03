const express = require("express");
const multer = require("multer");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const {
  uploadImage,
  getImages,
  deleteImage,
} = require("../controllers/imageController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes"));
    }
  },
});

router.use(authMiddleware);

router.get("/", getImages);
router.post("/upload", upload.single("image"), uploadImage);
router.delete("/:id", deleteImage);

module.exports = router;
