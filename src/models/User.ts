import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "receptionist" | "doctor" | "patient";
  patientId?: string;
  doctorId?: string;
  specialization?: string;
  phone?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["receptionist", "doctor", "patient"],
      required: true,
    },
    patientId: { type: String, unique: true, sparse: true },
    doctorId: { type: String, unique: true, sparse: true },
    specialization: { type: String },
    phone: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
