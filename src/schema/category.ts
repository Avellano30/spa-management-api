import mongoose from "mongoose";

export interface ICategory extends Document {
  name: string[];
}

const CategorySchema = new mongoose.Schema(
  {
    name: { type: [String], required: true },
  },
  { timestamps: true },
);

export const CategoryModel = mongoose.model<ICategory>(
  "Category",
  CategorySchema,
);
