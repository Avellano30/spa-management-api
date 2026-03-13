import { Request, Response } from "express";
import { CategoryModel } from "../schema/category";

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const category = new CategoryModel({
      name,
    });

    await category.save();

    return res.status(201).json(category);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllCategories = async (_: Request, res: Response) => {
  try {
    const categories = await CategoryModel.find();
    res.status(200).json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const category = await CategoryModel.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.status(200).json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    const existingCategory = await CategoryModel.findById(req.params.id);
    if (!existingCategory)
      return res.status(404).json({ message: "Category not found" });

    let updateData: Record<string, any> = {
      name,
    };

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    res.status(200).json(updatedCategory);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const category = await CategoryModel.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    await CategoryModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
