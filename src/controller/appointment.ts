import { Request, Response } from "express";
import { AppointmentModel } from "../schema/appointment";
import { ClientModel } from "../schema/client";
import { ServiceModel } from "../schema/service";
import { SpaSettingsModel } from "../schema/settings";
import { toHHMM, toMinutes } from "../helpers/timeUtils";

const TEMP_APPT_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes in milliseconds 

export const createAppointment = async (req: Request, res: Response) => {
	try {
		const { clientId, serviceId, date, startTime, notes, isTemporary } = req.body;

		if (!clientId || !serviceId || !date || !startTime)
			return res.status(400).json({ message: "Missing required fields" });

		const client = await ClientModel.findById(clientId);
		if (!client)
			return res.status(404).json({ message: "Client not found" });

		if (["banned", "inactive"].includes(client.status))
			return res.status(403).json({
				message:
					client.status === "banned"
						? "Account is banned and cannot book appointments."
						: "Account is inactive. Please contact support.",
			});

		const service = await ServiceModel.findById(serviceId);
		if (!service || service.status !== "available")
			return res.status(400).json({ message: "Service unavailable" });

		const settings = await SpaSettingsModel.findOne();
		if (!settings)
			return res.status(500).json({ message: "Settings not configured" });

		if (date < new Date().toISOString().split("T")[0])
			return res.status(400).json({ message: "Cannot book an appointment in the past" });

		// Compute time bounds
		const startMin = toMinutes(startTime);
		const endMin = startMin + service.duration;
		const openMin = toMinutes(settings.openingTime);
		const closeMin = toMinutes(settings.closingTime);

		if (startMin < openMin || endMin > closeMin)
			return res.status(400).json({ message: "Outside operating hours" });

		const endTime = toHHMM(endMin);

		// Count overlapping appointments for room availability
		const existingAppointments = await AppointmentModel.countDocuments({
			date,
			status: { $in: ["Approved", "Rescheduled"] },
			startTime: { $lt: endTime },
			endTime: { $gt: startTime },
		});

		if (existingAppointments >= settings.totalRooms)
			return res.status(400).json({ message: "All rooms are booked for this time slot" });

		const appointmentData: any = {
			clientId,
			serviceId,
			date,
			startTime,
			endTime,
			notes,
			status: "Pending",
			isTemporary,
		};

		// If temporary, set expiresAt for TTL cleanup
		if (isTemporary) {
			appointmentData.expiresAt = new Date(Date.now() + TEMP_APPT_LIFETIME_MS);
		}

		const appointment = await AppointmentModel.create(appointmentData);

		res.status(201).json(appointment);
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const updateAppointment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		if (updates.isTemporary === false) {
			updates.$unset = { expiresAt: "" };
		}
		
		const updated = await AppointmentModel.findByIdAndUpdate(id, updates, { new: true });
		if (!updated) return res.status(404).json({ message: "Appointment not found" });

		res.status(200).json({ message: "Appointment updated", appointment: updated });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const approveAppointment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const appointment = await AppointmentModel.findById(id);
		if (!appointment) return res.status(404).json({ message: "Appointment not found" });

		appointment.status = "Approved";
		appointment.isTemporary = false; // mark as final
		appointment.expiresAt = undefined; // prevent TTL deletion
		await appointment.save();

		res.status(200).json({ message: "Appointment approved", appointment });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const cancelAppointment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const appointment = await AppointmentModel.findById(id);
		if (!appointment) return res.status(404).json({ message: "Appointment not found" });

		appointment.status = "Cancelled";
		await appointment.save();

		res.status(200).json({ message: "Appointment cancelled", appointment });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const rescheduleAppointment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { date, startTime, notes } = req.body;

		if (!date || !startTime)
			return res.status(400).json({ message: "Date and start time are required" });

		const appointment = await AppointmentModel.findById(id);
		if (!appointment) return res.status(404).json({ message: "Appointment not found" });

		const service = await ServiceModel.findById(appointment.serviceId);
		if (!service) return res.status(400).json({ message: "Service not found" });

		const settings = await SpaSettingsModel.findOne();
		if (!settings) return res.status(500).json({ message: "Settings not configured" });

		if (date < new Date().toISOString().split('T')[0])
			return res.status(400).json({ message: "Cannot reschedule to a past date" });

		const startMin = toMinutes(startTime);
		const endMin = startMin + service.duration;
		const openMin = toMinutes(settings.openingTime);
		const closeMin = toMinutes(settings.closingTime);

		if (startMin < openMin || endMin > closeMin)
			return res.status(400).json({ message: "Outside operating hours" });

		const endTime = toHHMM(endMin);

		const overlapCount = await AppointmentModel.countDocuments({
			date,
			status: { $in: ["Approved", "Rescheduled"] },
			_id: { $ne: id },
			startTime: { $lt: endTime },
			endTime: { $gt: startTime },
		});

		if (overlapCount >= settings.totalRooms)
			return res.status(400).json({ message: "All rooms booked for that slot" });

		if (notes) appointment.notes = notes;
		appointment.date = date;
		appointment.startTime = startTime;
		appointment.endTime = endTime;
		appointment.status = "Rescheduled";
		await appointment.save();

		res.status(200).json({ message: "Appointment rescheduled successfully", appointment });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const completeAppointment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const appointment = await AppointmentModel.findById(id);
		if (!appointment) return res.status(404).json({ message: "Appointment not found" });

		if (!["Approved", "Rescheduled"].includes(appointment.status))
			return res.status(400).json({ message: "Only approved appointments can be completed" });

		appointment.status = "Completed";
		await appointment.save();

		res.status(200).json({ message: "Appointment marked as completed", appointment });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const getAppointments = async (req: Request, res: Response) => {
	try {
		const { status, date, clientId } = req.query;
		const filter: Record<string, any> = { isTemporary: false };

		if (status) filter.status = status;
		if (date) filter.date = new Date(date as string);
		if (clientId) filter.clientId = clientId;

		const appointments = await AppointmentModel.find(filter)
			.populate("clientId", "firstname lastname email phone")
			.populate("serviceId", "name description price duration category imageUrl")

		res.status(200).json({ count: appointments.length, appointments });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const getAppointmentById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const appointment = await AppointmentModel.findById(id)
			.populate("clientId", "firstname lastname email phone")
			.populate("serviceId", "name description price duration category imageUrl")

		if (!appointment) return res.status(404).json({ message: "Appointment not found" });

		res.status(200).json({ appointment });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const getClientAppointments = async (req: Request, res: Response) => {
	try {
		const { clientId } = req.params;
		const appointments = await AppointmentModel.find({ clientId, isTemporary: false })
			.populate("serviceId", "name description price duration category imageUrl")
			.populate("payments")
			.sort({ date: -1 });

		if (!appointments.length)
			return res.status(404).json({ message: "No appointments found for this client" });

		res.status(200).json({ count: appointments.length, appointments });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const deleteTemporaryAppointment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await AppointmentModel.findOneAndDelete({ _id: id, isTemporary: true });
		res.json({ message: "Temporary appointment deleted" });
	} catch (err: any) {
		res.status(500).json({ message: err.message });
	}
};
