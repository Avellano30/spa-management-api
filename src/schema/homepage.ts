import mongoose, { Schema, Document } from "mongoose";

export interface IHomepage extends Document {
    brand: {
        name: string;
        logoUrl?: string;
        logoPublicId?: string;
    };
    contact: {
        email: string;
        phone?: string;
        address?: string;
    };
    content: {
        heading?: string;
        description?: string;
        bodyDescription?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const HomepageSchema = new Schema<IHomepage>(
    {
        brand: {
            name: { type: String, required: true },
            logoUrl: { type: String },
            logoPublicId: { type: String },
        },
        contact: {
            email: { type: String, required: true },
            phone: { type: String },
            address: { type: String },
        },
        content: {
            heading: { type: String },
            description: { type: String },
            bodyDescription: { type: String },
        },
    },
    { timestamps: true, collection: "homepage_settings" }
);

export const HomepageModel = mongoose.model<IHomepage>("Homepage", HomepageSchema);
