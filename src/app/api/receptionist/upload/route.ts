import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MedicalRecord from "@/models/MedicalRecord";
import { getAuthUser } from "@/lib/auth";
import { encryptBuffer } from "@/lib/encryption";
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

    // Step 1: Encrypt the file with AES-256
    const encryptedBuffer = encryptBuffer(fileBuffer);

    // Step 2: Upload encrypted file to Pinata (IPFS)
    const { ipfsHash } = await uploadToPinata(
      encryptedBuffer,
      `encrypted_${file.name}`
    );

    // Step 3: Store file hash on BigchainDB
    const bigchainTx = await storeFileRecord(
      patientId,
      file.name,
      ipfsHash,
      authUser.name
    );

    // Step 4: Save record in MongoDB for quick lookups
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
