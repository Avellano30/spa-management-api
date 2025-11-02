import mongoose, { Schema, Document } from "mongoose";

export interface IAppointment extends Document {
	clientId: mongoose.Types.ObjectId;
	serviceId: mongoose.Types.ObjectId;
	date: Date;
	startTime: string; // e.g. "11:00"
	endTime: string;   // e.g. "13:30"
	status: "Pending" | "Approved" | "Cancelled" | "Rescheduled" | "Completed";
	modeOfPayment?: "Online" | "Cash";
	downPayment?: number;
	remainingBalance?: number;
	totalPrice?: number;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
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
		modeOfPayment: { type: String, enum: ["Online", "Cash"], default: "Cash" },
		downPayment: { type: Number, default: 0 },
		remainingBalance: { type: Number, default: 0 },
		totalPrice: { type: Number },
		notes: { type: String, trim: true },
	},
	{ timestamps: true, collection: "appointments" }
);

AppointmentSchema.index({ date: 1, startTime: 1, endTime: 1 });

export const AppointmentModel = mongoose.model<IAppointment>(
	"Appointment",
	AppointmentSchema
);

export const getAppointments = () =>
	AppointmentModel.find().populate("clientId serviceId");

export const getAppointmentById = (id: string) =>
	AppointmentModel.findById(id).populate("clientId serviceId");

export const createAppointment = (values: Record<string, any>) =>
	new AppointmentModel(values).save();

export const updateAppointmentById = (id: string, values: Record<string, any>) =>
	AppointmentModel.findByIdAndUpdate(id, values, { new: true });

export const deleteAppointmentById = (id: string) =>
	AppointmentModel.findByIdAndDelete(id);
