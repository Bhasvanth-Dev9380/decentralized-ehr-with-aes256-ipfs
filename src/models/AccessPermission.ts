import { JsonCollection } from "@/lib/jsonStore";

export interface IAccessPermission {
  _id: string;
  patientId: string;
  doctorId: string;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  reEncryptionKey?: string;
  createdAt: string;
  updatedAt?: string;
}

export default new JsonCollection("access-permissions");
