import mongoose, { Schema, Document } from "mongoose";

export interface IAccessLog extends Document {
  patientId: string;
  doctorId: string;
  doctorName: string;
  fileName: string;
  ipfsHash: string;
  accessGranted: boolean;
  timestamp: Date;
}

const AccessLogSchema = new Schema<IAccessLog>(
  {
    patientId: { type: String, required: true, index: true },
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    fileName: { type: String, required: true },
    ipfsHash: { type: String, required: true },
    accessGranted: { type: Boolean, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.AccessLog ||
  mongoose.model<IAccessLog>("AccessLog", AccessLogSchema);
