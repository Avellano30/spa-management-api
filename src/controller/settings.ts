import { Request, Response } from "express";
import { SpaSettingsModel } from "../schema/settings";
import { toMinutes } from "../helpers/timeUtils";

export const getSpaSettings = async (req: Request, res: Response) => {
    try {
        const settings = await SpaSettingsModel.findOne();
        if (!settings) {
            return res.status(404).json({ message: "Spa settings not configured" });
        }
        res.status(200).json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Create spa settings (for initial setup, should only be called once)
export const createSpaSettings = async (req: Request, res: Response) => {
    try {
        const existing = await SpaSettingsModel.findOne();
        if (existing) {
            return res.status(400).json({ message: "Settings already exist" });
        }

        const { totalRooms, openingTime, closingTime } = req.body;

        const newSettings = await SpaSettingsModel.create({
            totalRooms,
            openingTime,
            closingTime,
        });

        res.status(201).json(newSettings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSpaSettings = async (req: Request, res: Response) => {
    try {
        const { totalRooms, openingTime, closingTime } = req.body;

        if (totalRooms !== undefined && totalRooms < 1)
            return res.status(400).json({ message: "Total rooms must be at least 1" });

        const existingSettings =
            (await SpaSettingsModel.findOne()) ||
            (await SpaSettingsModel.create({
                totalRooms: 1,
                openingTime: "09:00",
                closingTime: "20:00",
            }));

        const newOpeningTime = openingTime || existingSettings.openingTime;
        const newClosingTime = closingTime || existingSettings.closingTime;

        const openTime = toMinutes(newOpeningTime);
        const closeTime = toMinutes(newClosingTime);

        // Validate relationship between new open/close times
        if (openTime >= closeTime)
            return res
                .status(400)
                .json({ message: "Opening time must be earlier than closing time" });

        if (closeTime - openTime < 60)
            return res
                .status(400)
                .json({ message: "Operating hours must be at least 1 hour long" });

        // Build the update object dynamically
        const updateData: Record<string, any> = {};
        if (totalRooms !== undefined) updateData.totalRooms = totalRooms;
        if (openingTime) updateData.openingTime = openingTime;
        if (closingTime) updateData.closingTime = closingTime;

        const updatedSettings = await SpaSettingsModel.findOneAndUpdate(
            {},
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.status(200).json(updatedSettings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

