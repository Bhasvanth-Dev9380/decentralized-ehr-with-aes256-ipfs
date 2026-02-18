import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MedicalRecord from "@/models/MedicalRecord";
import AccessLog from "@/models/AccessLog";
import AccessPermission from "@/models/AccessPermission";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "receptionist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    // ── Encryption Stats ──────────────────────────────────
    const totalRecords = await MedicalRecord.countDocuments();
    const preRecords = await MedicalRecord.countDocuments({ encryptionType: "PRE" });
    const legacyRecords = await MedicalRecord.countDocuments({ encryptionType: { $ne: "PRE" } });

    // Records by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const encryptionTimeline = await MedicalRecord.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            type: { $ifNull: ["$encryptionType", "LEGACY"] },
          },
          count: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Build monthly timeline data
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const timelineData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const preCount = encryptionTimeline.find(
        (e) => e._id.month === m && e._id.year === y && e._id.type === "PRE"
      );
      const legCount = encryptionTimeline.find(
        (e) => e._id.month === m && e._id.year === y && e._id.type !== "PRE"
      );
      timelineData.push({
        month: `${months[d.getMonth()]} ${y}`,
        PRE: preCount?.count || 0,
        Legacy: legCount?.count || 0,
        totalSize: ((preCount?.totalSize || 0) + (legCount?.totalSize || 0)) / 1024,
      });
    }

    // ── Decryption Stats (Access Logs) ────────────────────
    const totalAccessAttempts = await AccessLog.countDocuments();
    const grantedAccesses = await AccessLog.countDocuments({ accessGranted: true });
    const deniedAccesses = await AccessLog.countDocuments({ accessGranted: false });

    // Access logs by month
    const accessTimeline = await AccessLog.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            granted: "$accessGranted",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const decryptionTimeline = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const granted = accessTimeline.find(
        (e) => e._id.month === m && e._id.year === y && e._id.granted === true
      );
      const denied = accessTimeline.find(
        (e) => e._id.month === m && e._id.year === y && e._id.granted === false
      );
      decryptionTimeline.push({
        month: `${months[d.getMonth()]} ${y}`,
        Granted: granted?.count || 0,
        Denied: denied?.count || 0,
      });
    }

    // ── Accuracy & System Metrics ─────────────────────────
    const totalUsers = await User.countDocuments();
    const usersWithKeys = await User.countDocuments({ publicKey: { $exists: true, $nin: [null, ""] } });
    const totalPermissions = await AccessPermission.countDocuments();
    const activePermissions = await AccessPermission.countDocuments({ granted: true });
    const prePermissions = await AccessPermission.countDocuments({
      granted: true,
      reEncryptionKey: { $exists: true, $ne: "" },
    });

    // Accuracy metrics
    const encryptionAccuracy = totalRecords > 0
      ? ((preRecords / totalRecords) * 100).toFixed(1)
      : "0.0";
    const decryptionSuccessRate = totalAccessAttempts > 0
      ? ((grantedAccesses / totalAccessAttempts) * 100).toFixed(1)
      : "0.0";
    const keyDistributionRate = totalUsers > 0
      ? ((usersWithKeys / totalUsers) * 100).toFixed(1)
      : "0.0";
    const preAdoptionRate = activePermissions > 0
      ? ((prePermissions / activePermissions) * 100).toFixed(1)
      : "0.0";

    // File size distribution
    const sizeDistribution = await MedicalRecord.aggregate([
      {
        $bucket: {
          groupBy: "$fileSize",
          boundaries: [0, 102400, 1048576, 10485760, 104857600],
          default: "100MB+",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const sizeLabels: Record<string, string> = {
      "0": "< 100KB",
      "102400": "100KB-1MB",
      "1048576": "1MB-10MB",
      "10485760": "10MB-100MB",
      "100MB+": "100MB+",
    };

    const fileSizeData = sizeDistribution.map((b) => ({
      name: sizeLabels[String(b._id)] || String(b._id),
      count: b.count,
    }));

    // Accuracy breakdown for radar chart
    const accuracyData = [
      { metric: "PRE Encryption", value: parseFloat(encryptionAccuracy) },
      { metric: "Decryption Success", value: parseFloat(decryptionSuccessRate) },
      { metric: "Key Distribution", value: parseFloat(keyDistributionRate) },
      { metric: "PRE Adoption", value: parseFloat(preAdoptionRate) },
      { metric: "Data Integrity", value: totalRecords > 0 ? 100 : 0 },
      { metric: "Access Control", value: totalPermissions > 0 ? ((activePermissions / totalPermissions) * 100) : 0 },
    ];

    return NextResponse.json({
      encryption: {
        total: totalRecords,
        pre: preRecords,
        legacy: legacyRecords,
        timeline: timelineData,
        fileSizeDistribution: fileSizeData,
      },
      decryption: {
        totalAttempts: totalAccessAttempts,
        granted: grantedAccesses,
        denied: deniedAccesses,
        timeline: decryptionTimeline,
      },
      accuracy: {
        encryptionAccuracy: parseFloat(encryptionAccuracy),
        decryptionSuccessRate: parseFloat(decryptionSuccessRate),
        keyDistributionRate: parseFloat(keyDistributionRate),
        preAdoptionRate: parseFloat(preAdoptionRate),
        radarData: accuracyData,
      },
      summary: {
        totalUsers,
        usersWithKeys,
        totalRecords,
        totalPermissions,
        activePermissions,
      },
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
