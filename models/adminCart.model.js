// models/adminCart.model.js
const mongoose = require("mongoose");

const adminCartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person",
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String
  },
  userMobile: {
    type: String,
    required: true
  },
  tests: [{
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    testName: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    originalPrice: { // NEW: Store original price
      type: Number,
      required: true
    },
    discountedPrice: { // NEW: Store discounted price
      type: Number
    },
    hasOffer: { // NEW: Store offer status
      type: Boolean,
      default: false
    },
    offerDiscountPercent: { // NEW: Store discount percentage
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      default: 1
    },
    isExpertPackage: {
      type: Boolean,
      default: false
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  originalTotalAmount: { // NEW: Store original total
    type: Number,
    required: true
  },
  totalDiscount: { // NEW: Store total discount
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "cancelled"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("AdminCart", adminCartSchema);