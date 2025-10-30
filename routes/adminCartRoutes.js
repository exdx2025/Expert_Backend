// routes/adminCartRoutes.js
const express = require("express");
const router = express.Router();
const AdminCart = require("../models/adminCart.model");
const Person = require("../models/person.models");
const SubCategory = require("../models/subCategory.model"); // ADD THIS

router.post("/save", async (req, res) => {
  try {
    console.log("Received cart data:", req.body);

    const { user } = req.body;
    const userId = user?.userId;
    const cart = req.body.cart || req.body.items;

    if (!cart || !cart.length) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const person = await Person.findById(userId);
    if (!person) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // NEW: Process tests with offer information
    const tests = await Promise.all(
      cart.map(async (item) => {
        let testData = item;
        
        // If we have testId, fetch latest data to get current offers
        if (item.testId || item.subCategoryId) {
          const testId = item.testId?._id || item.subCategoryId?._id || item.testId || item.subCategoryId;
          try {
            const freshTest = await SubCategory.findById(testId);
            if (freshTest) {
              testData = freshTest;
            }
          } catch (error) {
            console.error("Error fetching test data:", error);
          }
        }

        // Calculate prices based on current offer status
        let originalPrice = 0;
        let finalPrice = 0;
        let hasOffer = false;
        let offerDiscountPercent = 0;
        let discountedPrice = null;

        if (item.isExpertPackage) {
          // Expert package pricing
          originalPrice = Number(item.discountPrice) || Number(item.price) || 0;
          finalPrice = originalPrice;
        } else {
          // Regular test pricing with offers
          originalPrice = parseFloat(testData.oldPrice || item.oldPrice || item.price || 0);
          const contrastPrice = parseFloat(testData.contrastPrice || item.contrastPrice || 0);
          
          // Check for active offer
          if (testData.hasOffer && testData.offerValidUntil) {
            const offerValidUntil = new Date(testData.offerValidUntil);
            if (offerValidUntil > new Date()) {
              // Offer is active
              discountedPrice = parseFloat(testData.offerDiscountedPrice || originalPrice);
              finalPrice = discountedPrice + contrastPrice;
              hasOffer = true;
              offerDiscountPercent = testData.offerDiscountPercent || 0;
            } else {
              // Offer expired
              finalPrice = originalPrice + contrastPrice;
            }
          } else {
            // No offer
            finalPrice = originalPrice + contrastPrice;
          }
        }

        return {
          testId: item.testId?._id || item.subCategoryId?._id || item.testId || item.subCategoryId,
          testName: item.testName || item.title || testData.title || "Unknown Test",
          quantity: item.quantity || 1,
          price: finalPrice, // Final price after discounts
          originalPrice: originalPrice, // Original price without discount
          discountedPrice: discountedPrice, // Discounted base price (without contrast)
          hasOffer: hasOffer,
          offerDiscountPercent: offerDiscountPercent,
          isExpertPackage: item.isExpertPackage || false,
          contrastPrice: testData.contrastPrice || item.contrastPrice || 0
        };
      })
    );

    // Calculate totals
    const originalTotalAmount = tests.reduce((sum, t) => sum + (t.originalPrice * t.quantity), 0);
    const totalAmount = tests.reduce((sum, t) => sum + (t.price * t.quantity), 0);
    const totalDiscount = originalTotalAmount - totalAmount;

    // Save to admin cart collection
    const adminCart = new AdminCart({
      userId,
      userName: person.name,
      userEmail: person.email,
      userMobile: person.mobile,
      tests,
      status: "pending",
      totalAmount,
      originalTotalAmount,
      totalDiscount
    });

    await adminCart.save();

    // Save to user's test history
    const historyEntries = tests.map(test => ({
      testId: test.testId,
      testName: test.testName,
      date: new Date(),
      status: "pending",
      price: test.price,
      originalPrice: test.originalPrice,
      discountedPrice: test.discountedPrice,
      hasOffer: test.hasOffer,
      offerDiscountPercent: test.offerDiscountPercent,
      quantity: test.quantity,
      isExpertPackage: test.isExpertPackage,
      contrastPrice: test.contrastPrice
    }));

    if (person.testHistory) {
      person.testHistory.push(...historyEntries);
    } else {
      person.testHistory = historyEntries;
    }

    await person.save();

    res.status(201).json({
      success: true,
      message: "Test request submitted successfully! Our team will contact you soon.",
      data: {
        totalAmount,
        originalTotalAmount,
        totalDiscount,
        testsCount: tests.length
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to process your request. Please try again.",
    });
  }
});

// Other routes remain the same...
router.put("/:id", async (req, res) => {
  try {
    const { status, userId } = req.body;

    const updatedCart = await AdminCart.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedCart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    if (userId) {
      const user = await Person.findById(userId);
      if (user && user.testHistory) {
        const testIds = updatedCart.tests.map(t => t.testId.toString());
        
        user.testHistory = user.testHistory.map(item => {
          if (testIds.includes(item.testId.toString())) {
            return { ...item, status };
          }
          return item;
        });

        await user.save();
      }
    }

    res.json(updatedCart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const carts = await AdminCart.find()
      .sort({ createdAt: -1 })
      .populate("userId", "name email mobile");
    res.json(carts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;