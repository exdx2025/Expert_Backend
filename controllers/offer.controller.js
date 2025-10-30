// controllers/offer.controller.js
const Offer = require("../models/offer.model");
const fs = require("fs");
const path = require("path");

// Create a new Offer
exports.createOffer = async (req, res) => {
  try {
    const { title, description, buttonText, offerText } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    // Create correct image URL path
    const imageUrl = `/uploads/offers/${req.file.filename}`;

    const newOffer = new Offer({
      title,
      description,
      buttonText: buttonText || "BOOK NOW",
      offerText: offerText || "40% \nOffer",
      imageUrl,
    });

    await newOffer.save();
    res.status(201).json({
      message: "Offer created successfully!",
      data: newOffer,
    });
  } catch (err) {
    console.error("Error creating Offer:", err);
    res.status(500).json({ error: "Failed to create Offer", details: err.message });
  }
};

// Get all Offers
exports.getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    
    // Make sure image URLs are correct
    const offersWithFullUrls = offers.map(offer => ({
      ...offer.toObject(),
      // Ensure the URL is properly formatted
      imageUrl: offer.imageUrl.startsWith('http') ? 
                offer.imageUrl : 
                offer.imageUrl
    }));
    
    res.status(200).json({ data: offersWithFullUrls });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Offers", details: err.message });
  }
};

// Get a single Offer by ID
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }
    res.status(200).json({ data: offer });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch Offer", details: err.message });
  }
};

// Update a Offer by ID
exports.updateOffer = async (req, res) => {
  try {
    const { title, description, buttonText, offerText } = req.body;
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    let imageUrl = offer.imageUrl;
    
    // If new image is uploaded
    if (req.file) {
      // Delete old image
      if (offer.imageUrl) {
        const oldImagePath = path.join(__dirname, '..', offer.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      imageUrl = `/uploads/offers/${req.file.filename}`;
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        buttonText,
        offerText,
        imageUrl,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Offer updated successfully!",
      data: updatedOffer,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update Offer", details: err.message });
  }
};

// Delete a Offer by ID
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Delete associated image
    if (offer.imageUrl) {
      const imagePath = path.join(__dirname, '..', offer.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Offer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Offer deleted successfully!" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete Offer", details: err.message });
  }
};