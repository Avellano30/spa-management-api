import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import { EmployeeModel } from "../schema/employee";
import * as fs from "fs";

export const createEmployee = async (req: Request, res: Response) => {
  let uploadedPublicId: string | undefined;

  try {
      const { name, status } = req.body;
      const schedule = req.body["schedule[]"]
          ? [].concat(req.body["schedule[]"])
          : req.body.schedule || [];

    if (!name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (req.file) {
      const filePath = req.file.path;
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "spa-employees",
      });
      fs.unlinkSync(filePath);

      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
      uploadedPublicId = imagePublicId;
    }

    const record = new EmployeeModel({
      name,
      status,
      imageUrl,
      imagePublicId: uploadedPublicId,
      schedule: schedule || [], // default to empty array if not provided
    });

    await record.save();

    return res.status(201).json(record);
  } catch (error: any) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId);
        console.log(`🧹 Rolled back Cloudinary image: ${uploadedPublicId}`);
      } catch (cleanupErr) {
        console.error("Failed to clean up Cloudinary image:", cleanupErr);
      }
    }

    return res.status(500).json({ message: error.message });
  }
};

export const getAllEmployees = async (_: Request, res: Response) => {
  try {
    const records = await EmployeeModel.find();
    res.status(200).json(records);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const record = await EmployeeModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.status(200).json(record);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  let uploadedPublicId: string | undefined;

  try {
      const { name, status } = req.body;
      const schedule = req.body["schedule[]"]
          ? [].concat(req.body["schedule[]"])
          : req.body.schedule || [];

    const existingRecord = await EmployeeModel.findById(req.params.id);
    if (!existingRecord)
      return res.status(404).json({ message: "Service not found" });

    let updateData: Record<string, any> = {
      name,
      status,
      schedule: schedule || [], // default to empty array if not provided
    };

    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (req.file) {
      if (existingRecord.imagePublicId) {
        await cloudinary.uploader.destroy(existingRecord.imagePublicId);
      }
      const filePath = req.file.path;
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "spa-employees",
      });
      fs.unlinkSync(filePath);

      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
      uploadedPublicId = imagePublicId; // track for rollback

      updateData.imageUrl = imageUrl;
      updateData.imagePublicId = imagePublicId;
    }

    const updatedService = await EmployeeModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    res.status(200).json(updatedService);
  } catch (error: any) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId);
        console.log(`🧹 Rolled back Cloudinary image: ${uploadedPublicId}`);
      } catch (cleanupErr) {
        console.error("Failed to clean up Cloudinary image:", cleanupErr);
      }
    }

    return res.status(500).json({ message: error.message });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const record = await EmployeeModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    if (record.imagePublicId) {
      await cloudinary.uploader.destroy(record.imagePublicId);
    }

    await EmployeeModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Record deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
