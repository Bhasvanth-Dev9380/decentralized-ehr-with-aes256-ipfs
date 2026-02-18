import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MedicalRecord from "@/models/MedicalRecord";
import AccessPermission from "@/models/AccessPermission";
import AccessLog from "@/models/AccessLog";
import { getAuthUser } from "@/lib/auth";
import { downloadFromPinata } from "@/lib/pinata";
import { decryptBuffer, decryptBufferWithKey } from "@/lib/encryption";
import { reEncrypt, decapsulateKey } from "@/lib/proxyReEncryption";
import { logAccessEvent } from "@/lib/bigchaindb";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const doctor = await User.findById(authUser.userId);
    if (!doctor || !doctor.doctorId) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const recordId = req.nextUrl.searchParams.get("recordId");
    if (!recordId) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const record = await MedicalRecord.findById(recordId);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Verify access permission
    const permission = await AccessPermission.findOne({
      patientId: record.patientId,
      doctorId: doctor.doctorId,
      granted: true,
    });

    // Log access attempt to MongoDB (always works)
    try {
      await AccessLog.create({
        patientId: record.patientId,
        doctorId: doctor.doctorId!,
        doctorName: doctor.name,
        fileName: record.originalName,
        ipfsHash: record.ipfsHash,
        accessGranted: !!permission,
        timestamp: new Date(),
      });
    } catch (mongoLogError) {
      console.error("Failed to save access log to MongoDB:", mongoLogError);
    }

    // Also log to BigchainDB (best-effort)
    try {
      await logAccessEvent(
        record.patientId,
        doctor.doctorId!,
        doctor.name,
        record.originalName,
        record.ipfsHash,
        !!permission
      );
    } catch (logError) {
      console.error("BigchainDB log failed (non-critical):", logError);
    }

    if (!permission) {
      return NextResponse.json(
        { error: "Access Not Granted" },
        { status: 403 }
      );
    }

    // Download encrypted file from IPFS
    const encryptedBuffer = await downloadFromPinata(record.ipfsHash);

    let decryptedBuffer: Buffer;

    // Determine decryption method based on encryption type
    if (
      record.encryptionType === "PRE" &&
      record.encryptedAesKey &&
      permission.reEncryptionKey &&
      doctor.privateKey
    ) {
      // ===== PROXY RE-ENCRYPTION FLOW =====
      // Step 1: Get the patient's public key (for transform key derivation)
      const patient = await User.findOne({
        patientId: record.patientId,
        role: "patient",
      });

      if (!patient || !patient.publicKey) {
        return NextResponse.json(
          { error: "Patient PRE keys not found" },
          { status: 500 }
        );
      }

      // Step 2: Proxy re-encrypts the capsule from patient's key space → doctor's key space
      const transformedCapsule = reEncrypt(
        record.encryptedAesKey, // Original capsule (AES key encrypted with patient's public key)
        permission.reEncryptionKey, // Re-encryption key for this patient→doctor pair
        patient.publicKey // Patient's public key (for HMAC derivation)
      );

      // Step 3: Doctor decapsulates — decrypts the transformed capsule with their private key
      const aesKeyHex = decapsulateKey(transformedCapsule, doctor.privateKey);

      // Step 4: Decrypt the file using the recovered per-file AES key
      decryptedBuffer = decryptBufferWithKey(encryptedBuffer, aesKeyHex);
    } else {
      // ===== LEGACY FLOW (global AES key) =====
      decryptedBuffer = decryptBuffer(encryptedBuffer);
    }

    // Return decrypted file
    const resultBuffer = new Uint8Array(decryptedBuffer).buffer;
    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": record.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${record.originalName}"`,
        "Content-Length": decryptedBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Access error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to access file" },
      { status: 500 }
    );
  }
}
