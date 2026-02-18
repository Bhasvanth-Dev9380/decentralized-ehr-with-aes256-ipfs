"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  FiFile,
  FiClock,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
} from "react-icons/fi";

interface Record {
  _id: string;
  patientId: string;
  fileName: string;
  originalName: string;
  ipfsHash: string;
  bigchainTxId: string;
  uploadedBy: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface AccessLog {
  id: string;
  doctorId: string;
  doctorName: string;
  fileName: string;
  accessGranted: boolean;
  timestamp: string;
}

interface Permission {
  doctorId: string;
  doctorName: string;
  specialization: string;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  preEnabled?: boolean;
}

interface Doctor {
  _id: string;
  name: string;
  doctorId: string;
  specialization: string;
  phone: string;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "records" | "access-logs" | "permissions"
  >("records");
  const [records, setRecords] = useState<Record[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorIdInput, setDoctorIdInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.role !== "patient") {
          router.push("/");
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  const fetchRecords = async () => {
    const res = await fetch("/api/patient/records");
    const data = await res.json();
    if (res.ok) setRecords(data.records);
  };

  const fetchAccessLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/access-logs");
      const data = await res.json();
      if (res.ok) setAccessLogs(data.logs);
    } catch {
      console.error("Failed to fetch logs");
    }
    setLoading(false);
  };

  const fetchPermissions = async () => {
    const res = await fetch("/api/patient/permissions");
    const data = await res.json();
    if (res.ok) setPermissions(data.permissions);
  };

  const fetchDoctors = async () => {
    const res = await fetch("/api/patient/doctors");
    const data = await res.json();
    if (res.ok) setDoctors(data.doctors);
  };

  useEffect(() => {
    if (activeTab === "records") fetchRecords();
    if (activeTab === "access-logs") fetchAccessLogs();
    if (activeTab === "permissions") {
      fetchPermissions();
      fetchDoctors();
    }
  }, [activeTab]);

  const handleGrantAccess = async (doctorId: string, grant: boolean) => {
    try {
      const res = await fetch("/api/patient/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, grant }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchPermissions();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to update permission");
    }
  };

  const handleGrantNewDoctor = async () => {
    if (!doctorIdInput.trim()) {
      toast.error("Enter a Doctor ID");
      return;
    }
    await handleGrantAccess(doctorIdInput.trim(), true);
    setDoctorIdInput("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={user.name} role="patient" />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Patient Dashboard
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "records" as const, label: "My Records", icon: FiFile },
            { id: "access-logs" as const, label: "Access Logs (Blockchain)", icon: FiClock },
            { id: "permissions" as const, label: "Manage Access", icon: FiShield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                activeTab === tab.id
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Records Tab */}
        {activeTab === "records" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">My Medical Records</h2>
            {records.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No medical records found.
              </p>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record._id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          <FiFile className="text-green-600" />
                          {record.originalName}
                        </h3>
                        <div className="text-xs text-gray-500 mt-1 space-x-4">
                          <span>
                            Size: {formatFileSize(record.fileSize)}
                          </span>
                          <span>
                            Uploaded by: {record.uploadedBy}
                          </span>
                          <span>
                            Date:{" "}
                            {new Date(record.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-gray-500">
                          IPFS:{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            {record.ipfsHash.slice(0, 16)}...
                          </code>
                        </div>
                        <div className="text-gray-500 mt-1">
                          TX:{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            {record.bigchainTxId.slice(0, 16)}...
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Access Logs Tab */}
        {activeTab === "access-logs" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-2">
              Access Logs from Blockchain
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              These logs are retrieved from BigchainDB transactions and are
              immutable.
            </p>
            {loading ? (
              <p className="text-center py-8 text-gray-500">
                Loading from blockchain...
              </p>
            ) : accessLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No access logs found on blockchain.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4">Doctor</th>
                      <th className="text-left py-3 px-4">Doctor ID</th>
                      <th className="text-left py-3 px-4">File Accessed</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">
                          {log.doctorName}
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                          {log.doctorId}
                        </td>
                        <td className="py-3 px-4">{log.fileName}</td>
                        <td className="py-3 px-4">
                          {log.accessGranted ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <FiCheckCircle /> Granted
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <FiXCircle /> Denied
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === "permissions" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              Manage Doctor Access
            </h2>

            {/* Grant to new doctor */}
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Enter Doctor ID (e.g., DOC123456)"
                value={doctorIdInput}
                onChange={(e) => setDoctorIdInput(e.target.value)}
                className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
              />
              <button
                onClick={handleGrantNewDoctor}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
              >
                <FiShield size={16} />
                Grant Access
              </button>
            </div>

            {/* Current Permissions */}
            {permissions.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Current Permissions</h3>
                <div className="space-y-3 mb-6">
                  {permissions.map((p) => (
                    <div
                      key={p.doctorId}
                      className="flex items-center justify-between border rounded-lg p-4"
                    >
                      <div>
                        <h3 className="font-medium">Dr. {p.doctorName}</h3>
                        <div className="text-xs text-gray-500">
                          {p.specialization} &bull; ID: {p.doctorId}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            p.granted
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.granted ? "Granted" : "Revoked"}
                        </span>
                        {p.preEnabled && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            PRE
                          </span>
                        )}
                        <button
                          onClick={() =>
                            handleGrantAccess(p.doctorId, !p.granted)
                          }
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                            p.granted
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {p.granted ? "Revoke" : "Grant"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* All Doctors List */}
            <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase">All Registered Doctors</h3>
            {doctors.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No doctors registered yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Doctor ID</th>
                      <th className="text-left py-3 px-4">Specialization</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc) => {
                      const perm = permissions.find((p) => p.doctorId === doc.doctorId);
                      const isGranted = perm?.granted === true;
                      return (
                        <tr key={doc._id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">Dr. {doc.name}</td>
                          <td className="py-3 px-4 font-mono text-xs">{doc.doctorId}</td>
                          <td className="py-3 px-4 text-gray-600">{doc.specialization || "-"}</td>
                          <td className="py-3 px-4 text-gray-600">{doc.phone || "-"}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleGrantAccess(doc.doctorId, !isGranted)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                                isGranted
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                            >
                              {isGranted ? "Revoke Access" : "Grant Access"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
