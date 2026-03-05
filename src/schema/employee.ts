import mongoose from "mongoose";

export interface IEmployee extends Document {
  name: string;
  imageUrl: string;
  imagePublicId: string;
  status: "available" | "unavailable";
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
  },
  { timestamps: true },
);

export const EmployeeModel = mongoose.model<IEmployee>(
  "Employee",
  ServiceSchema,
);
