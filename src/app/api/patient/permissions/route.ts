import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AccessPermission from "@/models/AccessPermission";
import { getAuthUser } from "@/lib/auth";
import { generateReEncryptionKey, getKeyFingerprint } from "@/lib/proxyReEncryption";

// Grant or revoke access to a doctor
export async function POST(req: NextRequest) {
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

    const { doctorId, grant } = await req.json();

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    // Verify doctor exists
    const doctor = await User.findOne({ doctorId, role: "doctor" });
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    if (grant) {
      // Generate Proxy Re-Encryption key for this patient→doctor delegation
      let reEncryptionKey = "";
      if (patient.publicKey && patient.privateKey && doctor.publicKey) {
        reEncryptionKey = generateReEncryptionKey(
          patient.privateKey,
          patient.publicKey,
          doctor.publicKey
        );
      }

      await AccessPermission.findOneAndUpdate(
        { patientId: patient.patientId, doctorId },
        {
          granted: true,
          grantedAt: new Date(),
          reEncryptionKey,
          $unset: { revokedAt: 1 },
        },
        { upsert: true, new: true }
      );
      return NextResponse.json({
        message: `Access granted to Dr. ${doctor.name}`,
        preEnabled: !!reEncryptionKey,
      });
    } else {
      // Revoke: clear the re-encryption key (forward secrecy)
      await AccessPermission.findOneAndUpdate(
        { patientId: patient.patientId, doctorId },
        {
          granted: false,
          revokedAt: new Date(),
          reEncryptionKey: "", // Destroy re-encryption key on revocation
        },
        { upsert: true, new: true }
      );
      return NextResponse.json({ message: `Access revoked for Dr. ${doctor.name}` });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update access" },
      { status: 500 }
    );
  }
}

// Get current permissions
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

    const permissions = await AccessPermission.find({ patientId: patient.patientId });

    // Enrich with doctor names
    const enriched = await Promise.all(
      permissions.map(async (p: any) => {
        const doctor = await User.findOne({ doctorId: p.doctorId }).select("name specialization publicKey");
        return {
          doctorId: p.doctorId,
          doctorName: doctor?.name || "Unknown",
          specialization: doctor?.specialization || "",
          granted: p.granted,
          grantedAt: p.grantedAt,
          revokedAt: p.revokedAt,
          preEnabled: !!(p.reEncryptionKey && p.granted),
        };
      })
    );

    return NextResponse.json({ permissions: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
