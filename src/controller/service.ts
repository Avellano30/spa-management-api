import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import { ServiceModel } from "../schema/service";

export const createService = async (req: Request, res: Response) => {
  let uploadedPublicId: string | undefined;

  try {
    const { name, description, price, duration, category, status } = req.body;

    if (!name || !description || !price || !duration) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (req.file) {
      const fileData = req.file as any;
      imageUrl = fileData.path;
      imagePublicId = fileData.filename;
      uploadedPublicId = imagePublicId;  // track for rollback
    }

    const service = new ServiceModel({
      name,
      description,
      price,
      duration,
      category,
      status,
      imageUrl,
      imagePublicId,
    });

    await service.save();

    return res.status(201).json({
      message: "Service created successfully",
      service,
    });
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


export const getAllServices = async (_: Request, res: Response) => {
    try {
        const services = await ServiceModel.find();
        res.status(200).json(services);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getServiceById = async (req: Request, res: Response) => {
    try {
        const service = await ServiceModel.findById(req.params.id);
        if (!service) return res.status(404).json({ message: "Service not found" });
        res.status(200).json(service);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateService = async (req: Request, res: Response) => {
    let uploadedPublicId: string | undefined;

    try {
    const { name, description, price, duration, category, status } = req.body;

    const existingService = await ServiceModel.findById(req.params.id);
    if (!existingService)
      return res.status(404).json({ message: "Service not found" });

    let updateData: Record<string, any> = {
      name,
      description,
      price,
      duration,
      category,
      status,
    };

    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (req.file) {
      if (existingService.imagePublicId) {
        await cloudinary.uploader.destroy(existingService.imagePublicId);
      }
      const fileData = req.file as any;
      console.log("File Data:", fileData);
      imageUrl = fileData.path;
      imagePublicId = fileData.filename;
      uploadedPublicId = imagePublicId;  // track for rollback

      updateData.imageUrl = imageUrl;
      updateData.imagePublicId = imagePublicId;
    }
    console.log("Update Data:", updateData);
    const updatedService = await ServiceModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: "Service updated successfully",
      service: updatedService,
    });
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

export const deleteService = async (req: Request, res: Response) => {
    try {
    const service = await ServiceModel.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });

    if (service.imagePublicId) {
      await cloudinary.uploader.destroy(service.imagePublicId);
    }

    await ServiceModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
