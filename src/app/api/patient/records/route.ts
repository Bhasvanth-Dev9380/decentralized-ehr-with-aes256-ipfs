import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MedicalRecord from "@/models/MedicalRecord";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    // Find patient to get patientId
    const patient = await User.findById(authUser.userId);
    if (!patient || !patient.patientId) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const records = await MedicalRecord.find({ patientId: patient.patientId })
      .sort({ createdAt: -1 });

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch records" },
      { status: 500 }
    );
  }
}
