import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AccessLog from "@/models/AccessLog";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const patient = await User.findById(authUser.userId);
    if (!patient || !patient.patientId) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get access logs from MongoDB
    const logs = await AccessLog.find({ patientId: patient.patientId })
      .sort({ timestamp: -1 });

    const formattedLogs = logs.map((log) => ({
      id: log._id.toString(),
      doctorId: log.doctorId,
      doctorName: log.doctorName,
      fileName: log.fileName,
      accessGranted: log.accessGranted,
      timestamp: log.timestamp,
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch access logs" },
      { status: 500 }
    );
  }
}
