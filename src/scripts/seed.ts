/**
 * Seed script - Creates a default receptionist account
 * Run: npm run seed
 * (Requires MongoDB to be running)
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/medical-records";
console.log("Connecting to:", MONGODB_URI.replace(/\/\/.*@/, "//***:***@"));

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  patientId: String,
  doctorId: String,
  specialization: String,
  phone: String,
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create receptionist
    const existingReceptionist = await User.findOne({ email: "receptionist@medchain.com" });
    if (!existingReceptionist) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      await User.create({
        name: "Admin Receptionist",
        email: "receptionist@medchain.com",
        password: hashedPassword,
        role: "receptionist",
        phone: "1234567890",
      });
      console.log("✅ Receptionist created: receptionist@medchain.com / password123");
    } else {
      console.log("ℹ️  Receptionist already exists");
    }

    // Create a sample doctor
    const existingDoctor = await User.findOne({ email: "doctor@medchain.com" });
    if (!existingDoctor) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      await User.create({
        name: "Dr. John Smith",
        email: "doctor@medchain.com",
        password: hashedPassword,
        role: "doctor",
        doctorId: "DOC100001",
        specialization: "Cardiologist",
        phone: "9876543210",
      });
      console.log("✅ Doctor created: doctor@medchain.com / password123 (ID: DOC100001)");
    } else {
      console.log("ℹ️  Doctor already exists");
    }

    // Create a sample patient
    const existingPatient = await User.findOne({ email: "patient@medchain.com" });
    if (!existingPatient) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      await User.create({
        name: "Jane Doe",
        email: "patient@medchain.com",
        password: hashedPassword,
        role: "patient",
        patientId: "PAT100001",
        phone: "5555555555",
      });
      console.log("✅ Patient created: patient@medchain.com / password123 (ID: PAT100001)");
    } else {
      console.log("ℹ️  Patient already exists");
    }

    console.log("\n🎉 Seed completed!");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
