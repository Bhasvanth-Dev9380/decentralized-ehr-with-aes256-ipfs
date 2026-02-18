"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  FiUserPlus,
  FiUpload,
  FiUsers,
  FiFile,
  FiCheckCircle,
  FiBarChart2,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  patientId?: string;
  doctorId?: string;
  specialization?: string;
  phone?: string;
}

interface AnalyticsData {
  encryption: {
    total: number;
    pre: number;
    legacy: number;
    timeline: { month: string; PRE: number; Legacy: number; totalSize: number }[];
    fileSizeDistribution: { name: string; count: number }[];
  };
  decryption: {
    totalAttempts: number;
    granted: number;
    denied: number;
    timeline: { month: string; Granted: number; Denied: number }[];
  };
  accuracy: {
    encryptionAccuracy: number;
    decryptionSuccessRate: number;
    keyDistributionRate: number;
    preAdoptionRate: number;
    radarData: { metric: string; value: number }[];
  };
  summary: {
    totalUsers: number;
    usersWithKeys: number;
    totalRecords: number;
    totalPermissions: number;
    activePermissions: number;
  };
}

const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#6366f1"];

export default function ReceptionistDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"register" | "upload" | "users" | "analytics">(
    "register"
  );
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Register form
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
    specialization: "",
    phone: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPatientId, setUploadPatientId] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.role !== "receptionist") {
          router.push("/");
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  const fetchUsers = async () => {
    const res = await fetch("/api/receptionist/users");
    const data = await res.json();
    if (res.ok) setUsers(data.users);
  };

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/receptionist/analytics");
      const data = await res.json();
      if (res.ok) setAnalytics(data);
    } catch {
      toast.error("Failed to load analytics");
    }
    setAnalyticsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    try {
      const res = await fetch("/api/receptionist/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        const idInfo = data.user.patientId
          ? `Patient ID: ${data.user.patientId}`
          : `Doctor ID: ${data.user.doctorId}`;
        toast.success(idInfo, { duration: 5000 });
        setRegisterForm({
          name: "",
          email: "",
          password: "",
          role: "patient",
          specialization: "",
          phone: "",
        });
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Registration failed");
    }
    setRegisterLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadPatientId) {
      toast.error("File and Patient ID are required");
      return;
    }
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("patientId", uploadPatientId);

      const res = await fetch("/api/receptionist/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("File uploaded and stored on blockchain!");
        setUploadResult(data.record);
        setUploadFile(null);
        setUploadPatientId("");
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Upload failed");
    }
    setUploadLoading(false);
  };

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={user.name} role="receptionist" />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Receptionist Dashboard
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "register" as const, label: "Register User", icon: FiUserPlus },
            { id: "upload" as const, label: "Upload Records", icon: FiUpload },
            { id: "users" as const, label: "View Users", icon: FiUsers },
            { id: "analytics" as const, label: "Analytics", icon: FiBarChart2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Register Tab */}
        {activeTab === "register" && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiUserPlus /> Register New User
            </h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={registerForm.role}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, role: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, name: e.target.value })
                    }
                    required
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={registerForm.phone}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, phone: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, email: e.target.value })
                    }
                    required
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        password: e.target.value,
                      })
                    }
                    required
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                {registerForm.role === "doctor" && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={registerForm.specialization}
                      onChange={(e) =>
                        setRegisterForm({
                          ...registerForm,
                          specialization: e.target.value,
                        })
                      }
                      placeholder="e.g., Cardiologist, Neurologist"
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={registerLoading}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
              >
                {registerLoading ? "Registering..." : "Register User"}
              </button>
            </form>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiUpload /> Upload Medical Record
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={uploadPatientId}
                  onChange={(e) => setUploadPatientId(e.target.value)}
                  placeholder="e.g., PAT123456"
                  required
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical File
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-purple-50 file:text-purple-700"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Security:</strong> File will be encrypted with a unique
                AES-256 key. The AES key is then encapsulated using the
                patient&apos;s RSA-2048 public key via Proxy Re-Encryption (PRE).
                The encrypted file is stored on IPFS and its hash recorded on BigchainDB.
              </div>
              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
              >
                {uploadLoading
                  ? "Encrypting & Uploading..."
                  : "Encrypt (AES+PRE) & Upload"}
              </button>
            </form>

            {/* Upload Result */}
            {uploadResult && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  <FiCheckCircle /> Upload Successful
                </h3>
                <div className="mt-2 text-sm text-green-700 space-y-1">
                  <p>
                    <strong>File:</strong> {uploadResult.fileName}
                  </p>
                  <p>
                    <strong>Encryption:</strong>{" "}
                    <span className="bg-green-100 px-1 rounded text-xs font-semibold">
                      AES-256 + PRE (RSA-2048)
                    </span>
                  </p>
                  <p>
                    <strong>IPFS Hash:</strong>{" "}
                    <code className="bg-green-100 px-1 rounded text-xs">
                      {uploadResult.ipfsHash}
                    </code>
                  </p>
                  <p>
                    <strong>BigchainDB TX:</strong>{" "}
                    <code className="bg-green-100 px-1 rounded text-xs">
                      {uploadResult.bigchainTxId}
                    </code>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiUsers /> Registered Users
            </h2>
            {users.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No users registered yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">ID</th>
                      <th className="text-left py-3 px-4">Specialization</th>
                      <th className="text-left py-3 px-4">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{u.name}</td>
                        <td className="py-3 px-4 text-gray-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.role === "doctor"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {u.patientId || u.doctorId || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {u.specialization || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {u.phone || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="text-center py-16 text-gray-500">Loading analytics...</div>
            ) : !analytics ? (
              <div className="text-center py-16 text-gray-500">No data available.</div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Records", value: analytics.summary.totalRecords, color: "bg-purple-50 text-purple-700 border-purple-200" },
                    { label: "PRE Encrypted", value: analytics.encryption.pre, color: "bg-blue-50 text-blue-700 border-blue-200" },
                    { label: "Access Attempts", value: analytics.decryption.totalAttempts, color: "bg-amber-50 text-amber-700 border-amber-200" },
                    { label: "Decryption Success", value: `${analytics.accuracy.decryptionSuccessRate}%`, color: "bg-green-50 text-green-700 border-green-200" },
                  ].map((card, i) => (
                    <div key={i} className={`border rounded-xl p-4 ${card.color}`}>
                      <p className="text-xs font-medium uppercase opacity-75">{card.label}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Row 1: Encryption Timeline + Encryption Type Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold mb-4">Encryption Timeline (Last 6 Months)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.encryption.timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="PRE" fill="#8b5cf6" name="PRE (AES+RSA)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Legacy" fill="#06b6d4" name="Legacy AES" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold mb-4">Encryption Type Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "PRE (AES+RSA)", value: analytics.encryption.pre || 0 },
                            { name: "Legacy AES", value: analytics.encryption.legacy || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#8b5cf6" />
                          <Cell fill="#06b6d4" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Row 2: Decryption (Access) Timeline + Access Outcome Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold mb-4">Decryption Access Timeline (Last 6 Months)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.decryption.timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="Granted" stroke="#10b981" fill="#d1fae5" name="Granted (Decrypted)" />
                        <Area type="monotone" dataKey="Denied" stroke="#ef4444" fill="#fee2e2" name="Denied" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold mb-4">Access Outcomes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Granted", value: analytics.decryption.granted || 0 },
                            { name: "Denied", value: analytics.decryption.denied || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Row 3: Accuracy Radar + Accuracy Bars */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold mb-4">System Accuracy Radar</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={analytics.accuracy.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar
                          name="Accuracy %"
                          dataKey="value"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.3}
                        />
                        <Tooltip formatter={(val: any) => `${Number(val).toFixed(1)}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold mb-4">Accuracy Metrics Breakdown</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={[
                          { metric: "PRE Encryption", value: analytics.accuracy.encryptionAccuracy },
                          { metric: "Decrypt Success", value: analytics.accuracy.decryptionSuccessRate },
                          { metric: "Key Distribution", value: analytics.accuracy.keyDistributionRate },
                          { metric: "PRE Adoption", value: analytics.accuracy.preAdoptionRate },
                        ]}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis dataKey="metric" type="category" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(val: any) => `${Number(val).toFixed(1)}%`} />
                        <Bar dataKey="value" name="Accuracy %" radius={[0, 6, 6, 0]}>
                          {[
                            { metric: "PRE Encryption", value: analytics.accuracy.encryptionAccuracy },
                            { metric: "Decrypt Success", value: analytics.accuracy.decryptionSuccessRate },
                            { metric: "Key Distribution", value: analytics.accuracy.keyDistributionRate },
                            { metric: "PRE Adoption", value: analytics.accuracy.preAdoptionRate },
                          ].map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Row 4: File Size Distribution */}
                {analytics.encryption.fileSizeDistribution.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold mb-4">Encrypted File Size Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analytics.encryption.fileSizeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Files" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
