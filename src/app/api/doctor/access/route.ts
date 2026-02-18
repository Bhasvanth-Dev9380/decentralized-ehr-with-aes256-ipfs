import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MedicalRecord from "@/models/MedicalRecord";
import AccessPermission from "@/models/AccessPermission";
import AccessLog from "@/models/AccessLog";
import { getAuthUser } from "@/lib/auth";
import { downloadFromPinata } from "@/lib/pinata";
import { decryptBuffer } from "@/lib/encryption";
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

    // Decrypt the file
    const decryptedBuffer = decryptBuffer(encryptedBuffer);

    // Return decrypted file
    const arrayBuffer = new Uint8Array(decryptedBuffer).buffer;
    return new NextResponse(arrayBuffer, {
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
