import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";

function generateId(prefix: string): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "receptionist") {
      return NextResponse.json({ error: "Unauthorized. Only receptionist can register users." }, { status: 403 });
    }

    await connectDB();
    const { name, email, password, role, specialization, phone } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    if (!["doctor", "patient"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'doctor' or 'patient'" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userData: any = {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
    };

    if (role === "patient") {
      userData.patientId = generateId("PAT");
    } else if (role === "doctor") {
      userData.doctorId = generateId("DOC");
      userData.specialization = specialization || "General";
    }

    const user = await User.create(userData);

    return NextResponse.json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patientId: user.patientId,
        doctorId: user.doctorId,
        specialization: user.specialization,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}
