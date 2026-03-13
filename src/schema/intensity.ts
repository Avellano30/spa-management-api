import mongoose from "mongoose";

export interface IIntensity extends Document {
  name: string[];
}

const IntensitySchema = new mongoose.Schema(
  {
    name: { type: [String], required: true },
  },
  { timestamps: true },
);

export const IntensityModel = mongoose.model<IIntensity>(
  "Intensity",
  IntensitySchema,
);
