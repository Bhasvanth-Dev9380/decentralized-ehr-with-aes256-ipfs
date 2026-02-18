import { JsonCollection } from "@/lib/jsonStore";

export interface IAccessLog {
  _id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  fileName: string;
  ipfsHash: string;
  accessGranted: boolean;
  timestamp: string;
  createdAt: string;
  updatedAt?: string;
}

export default new JsonCollection("access-logs");
