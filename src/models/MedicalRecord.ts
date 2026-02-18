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
  },
  { timestamps: true }
);

export default mongoose.models.MedicalRecord ||
  mongoose.model<IMedicalRecord>("MedicalRecord", MedicalRecordSchema);
