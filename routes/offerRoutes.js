// routes/offerRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const offerController = require("../controllers/offer.controller");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../uploads/offers");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Clean filename and add timestamp
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
    cb(null, "offer-" + Date.now() + "-" + originalName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Create multer instance with error handling
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "File too large. Max size is 5MB." });
    }
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Create a new Offer
router.post("/offers", upload.single("image"), handleMulterError, offerController.createOffer);

// Update a Offer by ID
router.put("/offers/:id", upload.single("image"), handleMulterError, offerController.updateOffer);

// Other routes
router.get("/offers", offerController.getAllOffers);
router.get("/offers/:id", offerController.getOfferById);
router.delete("/offers/:id", offerController.deleteOffer);

module.exports = router;