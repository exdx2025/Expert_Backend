const express = require("express");
const router = express.Router();
const Person = require("../models/person.models");
const { generateToken } = require("../Middleware/jwt");
const { sendOtp, validateOtp } = require("../utils/otpUtils");
const verifyToken = require("../Middleware/authMiddleware");
const SubCategory = require("../models/subCategory.model");
const mongoose = require("mongoose");
const ExpertServiceList = require("../models/expertServiceList.model");


// Register New User
router.post("/signup", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const existingUser = await Person.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({ error: "Email or mobile already exists!" });
    }
    const newUser = new Person({ name, email, mobile, password });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile, name, email } = req.body;
    let user = await Person.findOne({ mobile });

    if (!user) {
      const tempPassword = Math.random().toString(36).slice(-8);
      user = new Person({
        name: name || "User",
        email: email || "",
        mobile,
        password: tempPassword,
        cart: []
      });
    } else {
      if (name) user.name = name;
      if (email) user.email = email;
    }

    const verificationId = await sendOtp(mobile);
    user.verificationId = verificationId;
    await user.save();

    res.status(200).json({ message: "OTP sent successfully!", success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP.", success: false });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const user = await Person.findOne({ mobile });

    if (!user || !user.verificationId) {
      return res.status(400).json({ error: "Verification ID not found", success: false });
    }

    const isVerified = await validateOtp(user.verificationId, otp);
    if (!isVerified) {
      return res.status(400).json({ error: "Invalid or expired OTP", success: false });
    }

    user.verificationId = null;
    await user.save();

    const token = generateToken({ id: user._id, email: user.email, mobile: user.mobile });

    res.status(200).json({
      message: "Login successful!",
      token,
      user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile },
      success: true
    });
  } catch (err) {
    console.error("OTP verification error:", err.message);
    res.status(500).json({ error: "OTP verification failed", success: false });
  }
});

// Add to Cart
router.post("/cart/add", verifyToken, async (req, res) => {
  try {
    console.log("📦 Cart add request:", req.body);
    const { testId, isExpertPackage = false } = req.body;
    
    // Validate testId
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid test ID format"
      });
    }

    // Find user
    const user = await Person.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // For expert packages, skip existence check
    if (!isExpertPackage) {
      const testExists = await SubCategory.findById(testId);
      if (!testExists) {
        return res.status(404).json({
          success: false,
          error: "Test not found"
        });
      }
    }

    // Prepare cart item
    const cartItem = {
      testId: new mongoose.Types.ObjectId(testId),
      quantity: 1,
      addedAt: new Date(),
      isExpertPackage
    };

    // Check if item already exists in cart
    const existingIndex = user.cart.findIndex(item => 
      item.testId.toString() === testId && 
      item.isExpertPackage === isExpertPackage
    );

    if (existingIndex >= 0) {
      user.cart[existingIndex].quantity += 1;
    } else {
      user.cart.push(cartItem);
    }

    // Save with error handling
    try {
      const savedUser = await user.save();
      console.log("✅ Cart updated:", savedUser.cart);
      return res.json({
        success: true,
        message: "Item added to cart",
        cart: savedUser.cart
      });
    } catch (saveError) {
      console.error("💥 Save error:", saveError);
      return res.status(500).json({
        success: false,
        error: "Failed to update cart",
        details: process.env.NODE_ENV === 'development' ? saveError.message : undefined
      });
    }

  } catch (err) {
    console.error("🔥 Route error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Fetch Cart
router.get("/cart", verifyToken, async (req, res) => {
  try {
    const user = await Person.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const populatedCart = await Promise.all(
      user.cart.map(async (item) => {
        let testData = null;

        if (item.isExpertPackage) {
          // Expert Package → from ExpertServiceList
          testData = await ExpertServiceList.findById(item.testId).select(
            "testName oldPrice discountPrice discountPercent howManyTest reportTime consultation tagLine description selectedTests"
          );
        } else {
          // Regular Test → from SubCategory
          testData = await SubCategory.findById(item.testId).select(
            "title image oldPrice contrastPrice homeCollection"
          );
        }

        return {
          ...item.toObject(),
          testId: testData || null,
        };
      })
    );

    const validCart = populatedCart.filter((item) => item.testId !== null);
    res.status(200).json({ success: true, cart: validCart });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// Add verifyToken middleware to history and save-test-history routes
router.get("/history", verifyToken, async (req, res) => {  // Added verifyToken
  try {
    const person = await Person.findById(req.user.id).select("testHistory"); // Changed from _id to id
    if (!person) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ testHistory: person.testHistory || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// In your person.routes.js
router.post("/save-test-history", verifyToken, async (req, res) => {
  try {
    const { tests } = req.body;
    const userId = req.user.id;

    const person = await Person.findById(userId);
    if (!person) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Create a map to avoid duplicates
    const existingTests = new Map();
    person.testHistory.forEach(item => {
      existingTests.set(`${item.testId}-${item.isExpertPackage}`, true);
    });

    // Filter out duplicates before adding
    const newTests = tests.filter(test => {
      const key = `${test.testId}-${test.isExpertPackage || false}`;
      return !existingTests.has(key);
    });

    if (newTests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No new tests to add",
        testHistory: person.testHistory
      });
    }

    const historyItems = newTests.map(test => ({
      testId: test.testId,
      testName: test.testName,
      date: new Date(),
      status: "pending",
      price: test.price || 0,
      quantity: test.quantity || 1,
      isExpertPackage: test.isExpertPackage || false
    }));

    person.testHistory = [...person.testHistory, ...historyItems];
    await person.save();

    res.status(200).json({
      success: true,
      message: "Test history updated successfully",
      testHistory: person.testHistory
    });

  } catch (err) {
    console.error("Error saving history:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update test history"
    });
  }
});

// Add this new route if you want to update test status
router.put("/history/:testId/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await Person.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const testItem = user.testHistory.id(req.params.testId);
    if (!testItem) {
      return res.status(404).json({ error: "Test not found in history" });
    }

    testItem.status = status;
    await user.save();

    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// In your person.routes.js
router.delete("/cart/clear", verifyToken, async (req, res) => {
  try {
    const user = await Person.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    user.cart = [];
    await user.save();
    
    res.status(200).json({ success: true, message: "Cart cleared successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

// Remove from Cart
router.post("/cart/remove", verifyToken, async (req, res) => {
  try {
    const { testId } = req.body;
    const user = await Person.findById(req.user.id);
    user.cart = user.cart.filter(item => !item.testId.equals(testId));
    await user.save();
    res.status(200).json({ success: true, message: "Item removed from cart", cart: user.cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

// Get Profile
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await Person.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.status(200).json({ message: "Logged out successfully", success: true });
});

console.log("✅ personRoutes.js loaded");
module.exports = router;