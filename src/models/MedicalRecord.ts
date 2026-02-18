import mongoose, { Schema, Document } from "mongoose";

export interface IMedicalRecord extends Document {
  patientId: string;
  patientName: string;
  fileName: string;
  originalName: string;
  ipfsHash: string;
  bigchainTxId: string;
  uploadedBy: string;
  fileSize: number;
  mimeType: string;
  encryptedAesKey: string;
  encryptionType: "PRE" | "LEGACY";
  createdAt: Date;
}

const MedicalRecordSchema = new Schema<IMedicalRecord>(
  {
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    ipfsHash: { type: String, required: true },
    bigchainTxId: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    // Proxy Re-Encryption: AES key encapsulated with patient's RSA public key
    encryptedAesKey: { type: String, default: "" },   // Base64-encoded RSA capsule
    encryptionType: { type: String, enum: ["PRE", "LEGACY"], default: "LEGACY" },
  },
  { timestamps: true }
);

export default mongoose.models.MedicalRecord ||
  mongoose.model<IMedicalRecord>("MedicalRecord", MedicalRecordSchema);
