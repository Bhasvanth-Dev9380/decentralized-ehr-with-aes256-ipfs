"use client";

import { useRouter } from "next/navigation";
import { FiLogOut, FiLock, FiUser } from "react-icons/fi";
import { useState } from "react";
import toast from "react-hot-toast";

interface NavbarProps {
  userName: string;
  role: string;
}

export default function Navbar({ userName, role }: NavbarProps) {
  const router = useRouter();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Password changed successfully");
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to change password");
    }
    setLoading(false);
  };

  const roleColors: Record<string, string> = {
    receptionist: "bg-purple-600",
    doctor: "bg-blue-600",
    patient: "bg-green-600",
  };

  return (
    <>
      <nav className={`${roleColors[role] || "bg-gray-800"} text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold">🏥 MedChain</div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm capitalize">
              {role}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <FiUser />
              <span>{userName}</span>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm transition"
            >
              <FiLock size={14} />
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded text-sm transition"
            >
              <FiLogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Change Password</h2>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="password"
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading || !currentPassword || !newPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
