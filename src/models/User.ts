import { JsonCollection } from "@/lib/jsonStore";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: "receptionist" | "doctor" | "patient";
  patientId?: string;
  doctorId?: string;
  specialization?: string;
  phone?: string;
  publicKey?: string;
  privateKey?: string;
  createdAt: string;
  updatedAt?: string;
}

export default new JsonCollection("users");
