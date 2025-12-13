import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import fs from "fs";
import { HomepageModel, IHomepage } from "../schema/homepage";

// GET homepage settings
export const getHomepageSettings = async (req: Request, res: Response) => {
    try {
        const settings = await HomepageModel.findOne();
        if (!settings) {
            return res.status(404).json({ message: "Homepage settings not configured" });
        }
        res.status(200).json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE homepage settings
export const createHomepageSettings = async (req: Request, res: Response) => {
    let uploadedPublicId: string | undefined;

    try {
        const { brand, contact, content } = req.body as IHomepage;

        // Handle logo upload
        let logoUrl: string | undefined;
        let logoPublicId: string | undefined;

        if (req.file) {
            const filePath = req.file.path;
            const result = await cloudinary.uploader.upload(filePath, { folder: "homepage" });
            fs.unlinkSync(filePath);

            logoUrl = result.secure_url;
            logoPublicId = result.public_id;
            uploadedPublicId = logoPublicId;
        }

        const newSettings = await HomepageModel.create({
            brand: { ...brand, logoUrl, logoPublicId },
            contact,
            content,
        });

        res.status(201).json(newSettings);
    } catch (error: any) {
        if (uploadedPublicId) {
            try {
                await cloudinary.uploader.destroy(uploadedPublicId);
                console.log(`🧹 Rolled back Cloudinary logo: ${uploadedPublicId}`);
            } catch (cleanupErr) {
                console.error("Failed to clean up Cloudinary logo:", cleanupErr);
            }
        }
        res.status(500).json({ message: error.message });
    }
};

// UPDATE homepage settings
export const updateHomepageSettings = async (req: Request, res: Response) => {
    let uploadedPublicId: string | undefined;

    try {
        const { brand, contact, content } = req.body as Partial<IHomepage>;

        // Find existing settings
        const existing = await HomepageModel.findOne();
        if (!existing) {
            return res.status(404).json({ message: "Homepage settings not found" });
        }

        const updateData: Partial<IHomepage> = {};
        if (contact) updateData.contact = contact;
        if (content) updateData.content = content;

        // Handle logo upload
        if (req.file) {
            if (existing.brand.logoPublicId) {
                await cloudinary.uploader.destroy(existing.brand.logoPublicId);
            }

            const filePath = req.file.path;
            const result = await cloudinary.uploader.upload(filePath, { folder: "homepage" });
            fs.unlinkSync(filePath);

            updateData.brand = {
                ...existing.brand,
                ...brand,
                logoUrl: result.secure_url,
                logoPublicId: result.public_id,
            };
            uploadedPublicId = result.public_id;
        } else if (brand) {
            updateData.brand = { ...existing.brand, ...brand };
        }

        const updatedSettings = await HomepageModel.findOneAndUpdate(
            {},
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.status(200).json(updatedSettings);
    } catch (error: any) {
        if (uploadedPublicId) {
            try {
                await cloudinary.uploader.destroy(uploadedPublicId);
                console.log(`🧹 Rolled back Cloudinary logo: ${uploadedPublicId}`);
            } catch (cleanupErr) {
                console.error("Failed to clean up Cloudinary logo:", cleanupErr);
            }
        }
        res.status(500).json({ message: error.message });
    }
};
