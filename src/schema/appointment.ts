import mongoose, { Schema, Document } from "mongoose";

export interface IAppointment extends Document {
	clientId: mongoose.Types.ObjectId;
	serviceId: mongoose.Types.ObjectId;
	date: Date;
	startTime: string; // e.g. "11:00"
	endTime: string;   // e.g. "13:30"
	status: "Pending" | "Approved" | "Cancelled" | "Rescheduled" | "Completed";
	notes?: string;
	isTemporary: boolean;
	expiresAt?: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
	{
		clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
		serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
		date: { type: Date, required: true },
		startTime: { type: String, required: true },
		endTime: { type: String, required: true },
		status: {
			type: String,
			enum: ["Pending", "Approved", "Cancelled", "Rescheduled", "Completed"],
			default: "Pending",
		},
		notes: { type: String, trim: true, default: "" },
		isTemporary: {
			type: Boolean,
			default: false,
		},
		expiresAt: { type: Date, required: false }
	},
	{ timestamps: true, collection: "appointments" }
);

AppointmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AppointmentSchema.index({ date: 1, startTime: 1, endTime: 1 });

AppointmentSchema.virtual("payments", {
	ref: "Payment",
	localField: "_id",
	foreignField: "appointmentId",
});

AppointmentSchema.set("toJSON", { virtuals: true });
AppointmentSchema.set("toObject", { virtuals: true });


export const AppointmentModel = mongoose.model<IAppointment>(
	"Appointment",
	AppointmentSchema
);