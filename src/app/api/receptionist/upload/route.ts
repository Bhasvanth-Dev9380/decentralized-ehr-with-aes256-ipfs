import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MedicalRecord from "@/models/MedicalRecord";
import { getAuthUser } from "@/lib/auth";
import { encryptBufferWithKey } from "@/lib/encryption";
import { encapsulateKey } from "@/lib/proxyReEncryption";
import { uploadToPinata } from "@/lib/pinata";
import { storeFileRecord } from "@/lib/bigchaindb";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "receptionist") {
      return NextResponse.json(
        { error: "Unauthorized. Only receptionist can upload files." },
        { status: 403 }
      );
    }

    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patientId") as string | null;

    if (!file || !patientId) {
      return NextResponse.json(
        { error: "File and patient ID are required" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await User.findOne({ patientId, role: "patient" });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient with this ID not found" },
        { status: 404 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Step 1: Encrypt the file with a unique per-file AES-256 key
    const { encryptedData, aesKeyHex } = encryptBufferWithKey(fileBuffer);

    // Step 2: Encapsulate (encrypt) the AES key with patient's RSA public key
    //         This is the PRE "capsule" — only the patient's private key can open it
    let encryptedAesKey = "";
    let encryptionType: "PRE" | "LEGACY" = "LEGACY";

    if (patient.publicKey) {
      encryptedAesKey = encapsulateKey(aesKeyHex, patient.publicKey);
      encryptionType = "PRE";
    }

    // Step 3: Upload encrypted file to Pinata (IPFS)
    const { ipfsHash } = await uploadToPinata(
      encryptedData,
      `encrypted_${file.name}`
    );

    // Step 4: Store file hash on BigchainDB
    const bigchainTx = await storeFileRecord(
      patientId,
      file.name,
      ipfsHash,
      authUser.name
    );

    // Step 5: Save record in MongoDB with the encrypted AES key (capsule)
    const record = await MedicalRecord.create({
      patientId,
      patientName: patient.name,
      fileName: `encrypted_${file.name}`,
      originalName: file.name,
      ipfsHash,
      bigchainTxId: bigchainTx.id,
      uploadedBy: authUser.name,
      fileSize: file.size,
      mimeType: file.type,
      encryptedAesKey,
      encryptionType,
    });

    return NextResponse.json({
      message: "File uploaded successfully",
      record: {
        id: record._id,
        patientId,
        fileName: file.name,
        ipfsHash,
        bigchainTxId: bigchainTx.id,
        fileSize: file.size,
        encryptionType,
        preEnabled: encryptionType === "PRE",
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "File upload failed" },
      { status: 500 }
    );
  }
}
