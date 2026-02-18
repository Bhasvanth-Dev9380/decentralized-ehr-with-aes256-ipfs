import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const patients = await User.find({ role: "patient" })
      .select("name patientId phone")
      .sort({ name: 1 });

    return NextResponse.json({ patients });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
