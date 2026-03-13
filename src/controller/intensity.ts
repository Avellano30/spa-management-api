import { Request, Response } from "express";
import { IntensityModel } from "../schema/intensity";

export const createIntensity = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const intensity = new IntensityModel({
      name,
    });

    await intensity.save();

    return res.status(201).json(intensity);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllIntensities = async (_: Request, res: Response) => {
  try {
    const intensities = await IntensityModel.find();
    res.status(200).json(intensities);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getIntensityById = async (req: Request, res: Response) => {
  try {
    const intensity = await IntensityModel.findById(req.params.id);
    if (!intensity)
      return res.status(404).json({ message: "Intensity not found" });
    res.status(200).json(intensity);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateIntensity = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    const existingIntensity = await IntensityModel.findById(req.params.id);
    if (!existingIntensity)
      return res.status(404).json({ message: "Intensity not found" });

    let updateData: Record<string, any> = {
      name,
    };

    const updatedIntensity = await IntensityModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    res.status(200).json(updatedIntensity);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteIntensity = async (req: Request, res: Response) => {
  try {
    const intensity = await IntensityModel.findById(req.params.id);
    if (!intensity)
      return res.status(404).json({ message: "Intensity not found" });

    await IntensityModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Intensity deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
