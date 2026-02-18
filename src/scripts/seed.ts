/**
 * Seed script - Creates default accounts with RSA keypairs for PRE
 * Run: npm run seed
 * (Uses local JSON file storage — no MongoDB required)
 */

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const DATA_DIR = path.join(__dirname, "../../data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function generateId(): string {
  return crypto.randomBytes(12).toString("hex");
}

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

function readCollection(name: string): any[] {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeCollection(name: string, data: any[]): void {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function seed() {
  try {
    ensureDataDir();
    console.log("Using local JSON file storage in data/ directory");
    console.log("Generating RSA-2048 keypairs for Proxy Re-Encryption...\n");

    const users = readCollection("users");

    // Helper: find user by email
    const findByEmail = (email: string) => users.find((u: any) => u.email === email);

    // Create receptionist
    const existingReceptionist = findByEmail("receptionist@medchain.com");
    if (!existingReceptionist) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      const { publicKey, privateKey } = generateKeyPair();
      const now = new Date().toISOString();
      users.push({
        _id: generateId(),
        name: "Admin Receptionist",
        email: "receptionist@medchain.com",
        password: hashedPassword,
        role: "receptionist",
        phone: "1234567890",
        publicKey,
        privateKey,
        createdAt: now,
        updatedAt: now,
      });
      console.log("✅ Receptionist created: receptionist@medchain.com / password123");
      console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
    } else {
      if (!existingReceptionist.publicKey) {
        const { publicKey, privateKey } = generateKeyPair();
        existingReceptionist.publicKey = publicKey;
        existingReceptionist.privateKey = privateKey;
        existingReceptionist.updatedAt = new Date().toISOString();
        console.log("🔄 Receptionist updated with RSA keypair");
        console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
      } else {
        console.log("ℹ️  Receptionist already exists (with keypair)");
      }
    }

    // Create a sample doctor
    const existingDoctor = findByEmail("doctor@medchain.com");
    if (!existingDoctor) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      const { publicKey, privateKey } = generateKeyPair();
      const now = new Date().toISOString();
      users.push({
        _id: generateId(),
        name: "Dr. John Smith",
        email: "doctor@medchain.com",
        password: hashedPassword,
        role: "doctor",
        doctorId: "DOC100001",
        specialization: "Cardiologist",
        phone: "9876543210",
        publicKey,
        privateKey,
        createdAt: now,
        updatedAt: now,
      });
      console.log("✅ Doctor created: doctor@medchain.com / password123 (ID: DOC100001)");
      console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
    } else {
      if (!existingDoctor.publicKey) {
        const { publicKey, privateKey } = generateKeyPair();
        existingDoctor.publicKey = publicKey;
        existingDoctor.privateKey = privateKey;
        existingDoctor.updatedAt = new Date().toISOString();
        console.log("🔄 Doctor updated with RSA keypair");
        console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
      } else {
        console.log("ℹ️  Doctor already exists (with keypair)");
      }
    }

    // Create a sample patient
    const existingPatient = findByEmail("patient@medchain.com");
    if (!existingPatient) {
      const hashedPassword = await bcrypt.hash("password123", 12);
      const { publicKey, privateKey } = generateKeyPair();
      const now = new Date().toISOString();
      users.push({
        _id: generateId(),
        name: "Jane Doe",
        email: "patient@medchain.com",
        password: hashedPassword,
        role: "patient",
        patientId: "PAT100001",
        phone: "5555555555",
        publicKey,
        privateKey,
        createdAt: now,
        updatedAt: now,
      });
      console.log("✅ Patient created: patient@medchain.com / password123 (ID: PAT100001)");
      console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
    } else {
      if (!existingPatient.publicKey) {
        const { publicKey, privateKey } = generateKeyPair();
        existingPatient.publicKey = publicKey;
        existingPatient.privateKey = privateKey;
        existingPatient.updatedAt = new Date().toISOString();
        console.log("🔄 Patient updated with RSA keypair");
        console.log(`   🔑 RSA Public Key Fingerprint: ${getKeyFingerprint(publicKey)}`);
      } else {
        console.log("ℹ️  Patient already exists (with keypair)");
      }
    }

    // Write all users
    writeCollection("users", users);

    // Ensure other collection files exist
    for (const col of ["medical-records", "access-permissions", "access-logs"]) {
      const fp = path.join(DATA_DIR, `${col}.json`);
      if (!fs.existsSync(fp)) {
        fs.writeFileSync(fp, "[]", "utf-8");
        console.log(`📄 Created ${col}.json`);
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
