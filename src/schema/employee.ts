import mongoose from "mongoose";

export interface IEmployee extends Document {
  name: string;
  imageUrl: string;
  imagePublicId: string;
  status: "available" | "unavailable";
  schedule: string[]; // e.g. ["monday", "tuesday"]
}

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    status: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
    },
    schedule: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const EmployeeModel = mongoose.model<IEmployee>(
  "Employee",
  ServiceSchema,
);
