"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  FiSearch,
  FiDownload,
  FiFile,
  FiAlertCircle,
  FiCheckCircle,
  FiLock,
  FiUsers,
} from "react-icons/fi";

interface PatientInfo {
  name: string;
  patientId: string;
  phone: string;
}

interface PatientListItem {
  _id: string;
  name: string;
  patientId: string;
  phone: string;
}

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

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchPatientId, setSearchPatientId] = useState("");
  const [searching, setSearching] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientListItem[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.role !== "doctor") {
          router.push("/");
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push("/"));

    // Fetch patient list
    fetch("/api/doctor/patients")
      .then((r) => r.json())
      .then((data) => {
        if (data.patients) setPatients(data.patients);
      })
      .catch(() => {});
  }, [router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPatientId.trim()) {
      toast.error("Enter a Patient ID");
      return;
    }
    setSearching(true);
    setPatientInfo(null);
    setRecords([]);
    setAuthorized(null);

    try {
      const res = await fetch(
        `/api/doctor/search?patientId=${encodeURIComponent(searchPatientId.trim())}`
      );
      const data = await res.json();

      if (res.ok) {
        setAuthorized(true);
        setPatientInfo(data.patient);
        setRecords(data.records);
        toast.success(`Access granted - ${data.records.length} records found`);
      } else if (res.status === 403) {
        setAuthorized(false);
        toast.error("Access Not Granted", {
          icon: "🚫",
          duration: 4000,
          style: {
            background: "#FEE2E2",
            color: "#991B1B",
            fontWeight: "bold",
            fontSize: "16px",
          },
        });
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Search failed");
    }
    setSearching(false);
  };

  const handleDownload = async (record: Record) => {
    setDownloadingId(record._id);
    try {
      const res = await fetch(
        `/api/doctor/access?recordId=${record._id}`
      );

      if (res.status === 403) {
        toast.error("Access Not Granted", {
          icon: "🚫",
          style: {
            background: "#FEE2E2",
            color: "#991B1B",
            fontWeight: "bold",
          },
        });
        setDownloadingId(null);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Download failed");
        setDownloadingId(null);
        return;
      }

      // Download the decrypted file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success(`Downloaded & decrypted: ${record.originalName}`);
    } catch {
      toast.error("Download failed");
    }
    setDownloadingId(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={user.name} role="doctor" />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Doctor Dashboard
        </h1>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiSearch /> Search Patient Records
          </h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchPatientId}
              onChange={(e) => setSearchPatientId(e.target.value)}
              placeholder="Enter Patient ID (e.g., PAT123456)"
              className="flex-1 border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <FiSearch size={16} />
              {searching ? "Searching..." : "Search Records"}
            </button>
          </form>

          {/* Patient List */}
          {patients.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase flex items-center gap-2">
                <FiUsers size={14} /> Registered Patients
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-4">Name</th>
                      <th className="text-left py-2 px-4">Patient ID</th>
                      <th className="text-left py-2 px-4">Phone</th>
                      <th className="text-left py-2 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr key={p._id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium">{p.name}</td>
                        <td className="py-2 px-4 font-mono text-xs">{p.patientId}</td>
                        <td className="py-2 px-4 text-gray-600">{p.phone || "-"}</td>
                        <td className="py-2 px-4">
                          <button
                            onClick={() => {
                              setSearchPatientId(p.patientId);
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition"
                          >
                            Search Records
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Access Denied Pop-up */}
        {authorized === false && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 mb-6 text-center">
            <FiAlertCircle className="mx-auto text-red-500 mb-3" size={48} />
            <h3 className="text-2xl font-bold text-red-700 mb-2">
              Access Not Granted
            </h3>
            <p className="text-red-600">
              You do not have permission to view this patient&apos;s records.
              <br />
              The patient must grant you access from their dashboard.
            </p>
          </div>
        )}

        {/* Access Granted - Patient Info & Records */}
        {authorized === true && patientInfo && (
          <>
            {/* Patient Info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <FiCheckCircle className="text-green-600" size={24} />
                <div>
                  <h3 className="font-semibold text-green-800">
                    Access Granted - Patient: {patientInfo.name}
                  </h3>
                  <p className="text-sm text-green-700">
                    ID: {patientInfo.patientId} &bull; Phone:{" "}
                    {patientInfo.phone || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Records */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">
                Medical Records ({records.length})
              </h2>
              {records.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No records found for this patient.
                </p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div
                      key={record._id}
                      className="border rounded-lg p-4 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <FiFile className="text-blue-500" size={24} />
                        <div>
                          <h3 className="font-medium">{record.originalName}</h3>
                          <div className="text-xs text-gray-500 mt-1 space-x-3">
                            <span>
                              {formatFileSize(record.fileSize)}
                            </span>
                            <span>
                              Uploaded: {record.uploadedBy}
                            </span>
                            <span>
                              {new Date(record.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            <FiLock
                              className="inline mr-1"
                              size={10}
                            />
                            AES-256 Encrypted &bull; IPFS:{" "}
                            {record.ipfsHash.slice(0, 20)}...
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(record)}
                        disabled={downloadingId === record._id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                      >
                        <FiDownload size={14} />
                        {downloadingId === record._id
                          ? "Decrypting..."
                          : "Download & Decrypt"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Info Box */}
        {authorized === null && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center text-blue-700">
            <FiLock className="mx-auto mb-3" size={32} />
            <h3 className="font-semibold mb-1">Secure Record Access</h3>
            <p className="text-sm">
              Search for a patient by their ID. Access will be verified through
              BigchainDB. Files are AES-256 encrypted and stored on IPFS via
              Pinata — they will be decrypted upon authorized download.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
