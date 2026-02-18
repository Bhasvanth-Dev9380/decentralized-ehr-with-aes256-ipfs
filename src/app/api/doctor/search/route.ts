import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MedicalRecord from "@/models/MedicalRecord";
import AccessPermission from "@/models/AccessPermission";
import { getAuthUser } from "@/lib/auth";

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

    const patientId = req.nextUrl.searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await User.findOne({ patientId, role: "patient" });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check access permission
    const permission = await AccessPermission.findOne({
      patientId,
      doctorId: doctor.doctorId,
      granted: true,
    });

    if (!permission) {
      return NextResponse.json(
        { error: "Access Not Granted", authorized: false },
        { status: 403 }
      );
    }

    // Get patient records
    const records = await MedicalRecord.find({ patientId }).sort({
      createdAt: -1,
    });

    return NextResponse.json({
      authorized: true,
      patient: {
        name: patient.name,
        patientId: patient.patientId,
        phone: patient.phone,
      },
      records,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
