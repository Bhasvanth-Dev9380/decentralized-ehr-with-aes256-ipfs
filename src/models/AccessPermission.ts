import mongoose, { Schema, Document } from "mongoose";

export interface IAccessPermission extends Document {
  patientId: string;
  doctorId: string;
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
}

const AccessPermissionSchema = new Schema<IAccessPermission>(
  {
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    granted: { type: Boolean, default: true },
    grantedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

AccessPermissionSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

export default mongoose.models.AccessPermission ||
  mongoose.model<IAccessPermission>("AccessPermission", AccessPermissionSchema);
