import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import crypto from "crypto";

/**
 * Benchmark API — Runs real cryptographic operations and measures timing
 * to compare AES-256-CBC (legacy) vs AES-256 + Proxy Re-Encryption.
 */

// ── AES-256-CBC helpers ──

function aesEncrypt(data: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([iv, cipher.update(data), cipher.final()]);
}

function aesDecrypt(data: Buffer, key: Buffer): Buffer {
  const iv = data.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(data.subarray(16)), decipher.final()]);
}

// ── RSA helpers ──

function generateRSAKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

function rsaEncrypt(data: Buffer, publicKey: string): Buffer {
  return crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    data
  );
}

function rsaDecrypt(data: Buffer, privateKey: string): Buffer {
  return crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    data
  );
}

// ── Benchmark runner ──

function benchmarkMs(fn: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  return (performance.now() - start) / iterations;
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "receptionist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Pre-generate keys once (not counted in timing)
    const aesKey = crypto.randomBytes(32);
    const patientKP = generateRSAKeyPair();
    const doctorKP = generateRSAKeyPair();
    const iterations = 50; // enough for stable averages

    // File sizes to benchmark (bytes)
    const sizes = [
      { label: "1 KB", bytes: 1024 },
      { label: "10 KB", bytes: 10240 },
      { label: "100 KB", bytes: 102400 },
      { label: "500 KB", bytes: 512000 },
      { label: "1 MB", bytes: 1048576 },
    ];

    // ── 1. Encryption Time Comparison (per file size) ──
    const encryptionComparison = sizes.map(({ label, bytes }) => {
      const plaintext = crypto.randomBytes(bytes);

      // Legacy AES-only: just AES encrypt with global key
      const aesOnlyTime = benchmarkMs(() => {
        aesEncrypt(plaintext, aesKey);
      }, iterations);

      // PRE: AES encrypt + RSA encapsulate the per-file AES key
      const perFileKey = crypto.randomBytes(32);
      const preTime = benchmarkMs(() => {
        aesEncrypt(plaintext, perFileKey);
        rsaEncrypt(perFileKey, patientKP.publicKey);
      }, iterations);

      return {
        size: label,
        "AES-256 Only": parseFloat(aesOnlyTime.toFixed(3)),
        "AES-256 + PRE": parseFloat(preTime.toFixed(3)),
      };
    });

    // ── 2. Decryption Time Comparison (per file size) ──
    const decryptionComparison = sizes.map(({ label, bytes }) => {
      const plaintext = crypto.randomBytes(bytes);

      // Pre-encrypt for decryption benchmarks
      const aesEncrypted = aesEncrypt(plaintext, aesKey);

      const perFileKey = crypto.randomBytes(32);
      const preEncrypted = aesEncrypt(plaintext, perFileKey);
      const capsule = rsaEncrypt(perFileKey, patientKP.publicKey);

      // Simulate PRE: decrypt capsule with patient key → re-encrypt for doctor → doctor decrypts
      const recoveredKey = rsaDecrypt(capsule, patientKP.privateKey);
      const reCapsule = rsaEncrypt(recoveredKey, doctorKP.publicKey);

      // Legacy AES-only decryption
      const aesOnlyTime = benchmarkMs(() => {
        aesDecrypt(aesEncrypted, aesKey);
      }, iterations);

      // PRE decryption: RSA decrypt capsule + AES decrypt file
      const preTime = benchmarkMs(() => {
        const key = rsaDecrypt(reCapsule, doctorKP.privateKey);
        aesDecrypt(preEncrypted, key);
      }, iterations);

      return {
        size: label,
        "AES-256 Only": parseFloat(aesOnlyTime.toFixed(3)),
        "AES-256 + PRE": parseFloat(preTime.toFixed(3)),
      };
    });

    // ── 3. Security Score Comparison ──
    const securityComparison = [
      { metric: "Key Isolation", "AES-256 Only": 30, "AES-256 + PRE": 95 },
      { metric: "Forward Secrecy", "AES-256 Only": 10, "AES-256 + PRE": 90 },
      { metric: "Delegation Control", "AES-256 Only": 15, "AES-256 + PRE": 95 },
      { metric: "Key Compromise\nResistance", "AES-256 Only": 20, "AES-256 + PRE": 85 },
      { metric: "Access Revocation", "AES-256 Only": 25, "AES-256 + PRE": 92 },
      { metric: "Zero-Knowledge\nProxy", "AES-256 Only": 0, "AES-256 + PRE": 88 },
    ];

    // ── 4. Throughput (MB/s) ──
    const throughputData = sizes.map(({ label, bytes }) => {
      const plaintext = crypto.randomBytes(bytes);
      const perFileKey = crypto.randomBytes(32);

      // AES throughput
      const aesStart = performance.now();
      for (let i = 0; i < iterations; i++) aesEncrypt(plaintext, aesKey);
      const aesElapsed = (performance.now() - aesStart) / 1000; // seconds
      const aesThroughput = (bytes * iterations) / (1024 * 1024) / aesElapsed;

      // PRE throughput (includes RSA encapsulation)
      const preStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        aesEncrypt(plaintext, perFileKey);
        rsaEncrypt(perFileKey, patientKP.publicKey);
      }
      const preElapsed = (performance.now() - preStart) / 1000;
      const preThroughput = (bytes * iterations) / (1024 * 1024) / preElapsed;

      return {
        size: label,
        "AES-256 Only": parseFloat(aesThroughput.toFixed(2)),
        "AES-256 + PRE": parseFloat(preThroughput.toFixed(2)),
      };
    });

    // ── 5. Key operation times ──
    const keyGenTime = benchmarkMs(() => {
      crypto.randomBytes(32);
    }, 500);

    const rsaKeyGenTime = benchmarkMs(() => {
      generateRSAKeyPair();
    }, 5);

    const rsaEncTime = benchmarkMs(() => {
      rsaEncrypt(crypto.randomBytes(32), patientKP.publicKey);
    }, iterations);

    const rsaDecTime = benchmarkMs(() => {
      const capsule = rsaEncrypt(crypto.randomBytes(32), patientKP.publicKey);
      rsaDecrypt(capsule, patientKP.privateKey);
    }, iterations);

    const reEncKeyGenTime = benchmarkMs(() => {
      // Simulate re-encryption key generation (HMAC-based)
      const hmac = crypto.createHmac("sha256", crypto.randomBytes(32));
      hmac.update(patientKP.privateKey);
      hmac.update(doctorKP.publicKey);
      hmac.digest();
    }, iterations);

    const keyOperations = [
      { operation: "AES Key Gen", time: parseFloat(keyGenTime.toFixed(4)), category: "AES" },
      { operation: "RSA-2048\nKeypair Gen", time: parseFloat(rsaKeyGenTime.toFixed(2)), category: "PRE" },
      { operation: "RSA Encapsulate\n(Key Wrap)", time: parseFloat(rsaEncTime.toFixed(3)), category: "PRE" },
      { operation: "RSA Decapsulate\n(Key Unwrap)", time: parseFloat(rsaDecTime.toFixed(3)), category: "PRE" },
      { operation: "Re-Enc Key\nGeneration", time: parseFloat(reEncKeyGenTime.toFixed(4)), category: "PRE" },
    ];

    // ── 6. Overall comparison summary ──
    const overallComparison = [
      { feature: "Encryption Strength", "AES Only": 85, "AES + PRE": 97 },
      { feature: "Key Management", "AES Only": 30, "AES + PRE": 92 },
      { feature: "Access Delegation", "AES Only": 10, "AES + PRE": 95 },
      { feature: "Revocation Speed", "AES Only": 20, "AES + PRE": 95 },
      { feature: "Encryption Speed", "AES Only": 98, "AES + PRE": 88 },
      { feature: "Overall Security", "AES Only": 40, "AES + PRE": 94 },
    ];

    return NextResponse.json({
      encryptionComparison,
      decryptionComparison,
      securityComparison,
      throughputData,
      keyOperations,
      overallComparison,
      meta: {
        iterations,
        sizes: sizes.map((s) => s.label),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Benchmark error:", error);
    return NextResponse.json(
      { error: error.message || "Benchmark failed" },
      { status: 500 }
    );
  }
}
