import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
    appointmentId: mongoose.Types.ObjectId;
    amount: number;
    method: "Online" | "Cash";
    type: "Balance" | "Downpayment" | "Full" | "Refund";
    status: "Pending" | "Completed" | "Failed";
    transactionId?: string;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {
        appointmentId: {
            type: Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        method: {
            type: String,
            enum: ["Online", "Cash"],
            required: true,
        },
        type: {
            type: String,
            enum: ["Balance", "Downpayment", "Full", "Refund"],
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Completed", "Failed"],
            default: "Pending",
        },
        transactionId: {
            type: String,
        },
        remarks: {
            type: String,
            trim: true,
            default: ""
        },
    },
    { timestamps: true, collection: "payments" }
);

export const PaymentModel = mongoose.model<IPayment>("Payment", PaymentSchema);
