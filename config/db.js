const mongoose = require("mongoose");

// Remove require("dotenv").config(); from here
// Let it be loaded only in index.js

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    
    // Add debug logging
    console.log("MongoDB URI from env:", uri ? "Present" : "MISSING!");
    console.log("Node Environment:", process.env.NODE_ENV);
    
    if (!uri) {
      throw new Error("❌ MONGO_URI environment variable is not defined. Please check your Railway environment variables.");
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
    
    console.log("✅ MongoDB Connected Successfully");
    
    // Event listeners
    mongoose.connection.on("connected", () => {
      console.log("📊 Connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    
    // More detailed error information
    if (error.message.includes("undefined")) {
      console.error("💡 TROUBLESHOOTING:");
      console.error("1. Check if MONGO_URI is set in Railway environment variables");
      console.error("2. Verify the variable name is exactly 'MONGO_URI'");
      console.error("3. Try using the full MongoDB connection string");
    }
    
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;