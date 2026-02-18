import { JsonCollection } from "@/lib/jsonStore";

export interface IMedicalRecord {
  _id: string;
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
  createdAt: string;
  updatedAt?: string;
}

export default new JsonCollection("medical-records");
