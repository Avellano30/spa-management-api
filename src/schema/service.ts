import mongoose from "mongoose";

export interface IService extends Document {
	name: string;
	description: string;
	price: number;
	duration: number; // minutes
	category: string;
	imageUrl: string;
	imagePublicId: string;
	status: 'available' | 'unavailable';
}

const ServiceSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, unique: true },
		description: { type: String },
		price: { type: Number, required: true },
		duration: { type: Number, required: true }, // in minutes
		category: { type: String },
		imageUrl: { type: String },
		imagePublicId: { type: String },
		status: { type: String, enum: ["available", "unavailable"], default: "available" },
	},
	{ timestamps: true }
);

export const ServiceModel = mongoose.model<IService>("Service", ServiceSchema);
