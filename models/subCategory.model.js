// models/subCategory.model.js
const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema({
  expertSerialTestNo: { type: String, required: true },
  testNo: { type: String, required: true },
  image: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  oldPrice: { type: String, required: true },
  discountedPrice: { type: String, required: true },
  contrastPrice: { type: String, required: true },
  homeCollection: { type: String, required: true },
  
  // ADD THESE OFFER FIELDS TO YOUR EXISTING SCHEMA
  hasOffer: { type: Boolean, default: false },
  offerDiscountPercent: { type: Number, default: 0 },
  offerDiscountedPrice: { type: String },
  offerValidUntil: { type: Date },
  offerDescription: { type: String },
  
}, { timestamps: true });

module.exports = mongoose.model("SubCategory", subCategorySchema);