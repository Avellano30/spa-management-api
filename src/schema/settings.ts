import mongoose, { Schema, Document } from "mongoose";

export interface ISpaSettings extends Document {
	totalRooms: number; // total available rooms for appointments
	openingTime: string; // e.g. "09:00"
	closingTime: string; // e.g. "20:00"
	createdAt: Date;
	updatedAt: Date;
}

const SpaSettingsSchema = new Schema<ISpaSettings>(
	{
		totalRooms: { type: Number, required: true, default: 1, min: 1 },
		openingTime: { type: String, default: "09:00" },
		closingTime: { type: String, default: "20:00" },
	},
	{ timestamps: true, collection: "spa_settings" }
);

export const SpaSettingsModel = mongoose.model<ISpaSettings>(
	"SpaSettings",
	SpaSettingsSchema
);
