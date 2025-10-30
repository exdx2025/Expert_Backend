// controllers/testOffer.controller.js
const SubCategory = require("../models/subCategory.model");

// Apply offer to a test
exports.applyOfferToTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { 
      offerDiscountPercent, 
      offerValidUntil, 
      offerDescription 
    } = req.body;

    const test = await SubCategory.findById(testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Calculate offer discounted price
    const oldPrice = parseFloat(test.oldPrice);
    const discountAmount = (oldPrice * offerDiscountPercent) / 100;
    const offerDiscountedPrice = (oldPrice - discountAmount).toFixed(2);

    const updatedTest = await SubCategory.findByIdAndUpdate(
      testId,
      {
        hasOffer: true,
        offerDiscountPercent,
        offerDiscountedPrice,
        offerValidUntil: new Date(offerValidUntil),
        offerDescription
      },
      { new: true }
    );

    res.status(200).json({
      message: "Offer applied successfully!",
      data: updatedTest
    });
  } catch (err) {
    console.error("Error applying offer:", err);
    res.status(500).json({ error: "Failed to apply offer", details: err.message });
  }
};

// Remove offer from a test
exports.removeOfferFromTest = async (req, res) => {
  try {
    const { testId } = req.params;

    const updatedTest = await SubCategory.findByIdAndUpdate(
      testId,
      {
        hasOffer: false,
        offerDiscountPercent: 0,
        offerDiscountedPrice: null,
        offerValidUntil: null,
        offerDescription: null
      },
      { new: true }
    );

    res.status(200).json({
      message: "Offer removed successfully!",
      data: updatedTest
    });
  } catch (err) {
    console.error("Error removing offer:", err);
    res.status(500).json({ error: "Failed to remove offer", details: err.message });
  }
};

// Get all tests with active offers
exports.getTestsWithOffers = async (req, res) => {
  try {
    const currentDate = new Date();
    
    const testsWithOffers = await SubCategory.find({
      hasOffer: true,
      offerValidUntil: { $gte: currentDate }
    });

    res.status(200).json({ data: testsWithOffers });
  } catch (err) {
    console.error("Error fetching tests with offers:", err);
    res.status(500).json({ error: "Failed to fetch tests with offers", details: err.message });
  }
};