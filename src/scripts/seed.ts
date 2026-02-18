/**
 * Seed script - Creates default accounts with RSA keypairs for PRE
 * Run: npm run seed
 * (Requires MongoDB to be running)
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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
  publicKey: String,
  privateKey: String,
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

/**
 * Generate RSA-2048 keypair for Proxy Re-Encryption
 */
function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

function getKeyFingerprint(publicKey: string): string {
  return crypto.createHash("sha256").update(publicKey).digest("hex").slice(0, 16);
}

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    console.log("Generating RSA-2048 keypairs for Proxy Re-Encryption...\n");

    // Create receptionist
    const existingReceptionist = await User.findOne({ email: "receptionist@medchain.com" });
    if (!existingReceptionist) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      const { publicKey, privateKey } = generateKeyPair();
      await User.create({
        name: "Admin Receptionist",
        email: "receptionist@medchain.com",
        password: hashedPassword,
        role: "receptionist",
        phone: "1234567890",
        publicKey,
        privateKey,
      });
      console.log("✅ Receptionist created: receptionist@medchain.com / password123");
      console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
    } else {
      // Update existing user with keypair if they don't have one
      if (!existingReceptionist.get("publicKey")) {
        const { publicKey, privateKey } = generateKeyPair();
        await User.updateOne(
          { email: "receptionist@medchain.com" },
          { publicKey, privateKey }
        );
        console.log("🔄 Receptionist updated with RSA keypair");
        console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
      } else {
        console.log("ℹ️  Receptionist already exists (with keypair)");
      }
    }

    // Create a sample doctor
    const existingDoctor = await User.findOne({ email: "doctor@medchain.com" });
    if (!existingDoctor) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      const { publicKey, privateKey } = generateKeyPair();
      await User.create({
        name: "Dr. John Smith",
        email: "doctor@medchain.com",
        password: hashedPassword,
        role: "doctor",
        doctorId: "DOC100001",
        specialization: "Cardiologist",
        phone: "9876543210",
        publicKey,
        privateKey,
      });
      console.log("✅ Doctor created: doctor@medchain.com / password123 (ID: DOC100001)");
      console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
    } else {
      if (!existingDoctor.get("publicKey")) {
        const { publicKey, privateKey } = generateKeyPair();
        await User.updateOne(
          { email: "doctor@medchain.com" },
          { publicKey, privateKey }
        );
        console.log("🔄 Doctor updated with RSA keypair");
        console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
      } else {
        console.log("ℹ️  Doctor already exists (with keypair)");
      }
    }

    // Create a sample patient
    const existingPatient = await User.findOne({ email: "patient@medchain.com" });
    if (!existingPatient) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      const { publicKey, privateKey } = generateKeyPair();
      await User.create({
        name: "Jane Doe",
        email: "patient@medchain.com",
        password: hashedPassword,
        role: "patient",
        patientId: "PAT100001",
        phone: "5555555555",
        publicKey,
        privateKey,
      });
      console.log("✅ Patient created: patient@medchain.com / password123 (ID: PAT100001)");
      console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
    } else {
      if (!existingPatient.get("publicKey")) {
        const { publicKey, privateKey } = generateKeyPair();
        await User.updateOne(
          { email: "patient@medchain.com" },
          { publicKey, privateKey }
        );
        console.log("🔄 Patient updated with RSA keypair");
        console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
      } else {
        console.log("ℹ️  Patient already exists (with keypair)");
      }
    }

    console.log("\n🎉 Seed completed!");
    console.log("📋 Proxy Re-Encryption: All users now have RSA-2048 keypairs");
    console.log("   - Upload files → AES-256 encrypted + key encapsulated via RSA");
    console.log("   - Grant access → Re-encryption key generated");
    console.log("   - Doctor access → Proxy re-encrypts capsule → Doctor decrypts\n");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
