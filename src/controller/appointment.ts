import { Request, Response } from "express";
import { AppointmentModel } from "../schema/appointment";
import { ClientModel } from "../schema/client";
import { ServiceModel } from "../schema/service";
import { SpaSettingsModel } from "../schema/settings";
import { isOverlapping } from "../helpers/checkOverlap";
import { toMinutes } from "../helpers/convertTime";


export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { clientId, serviceId, date, startTime, modeOfPayment, notes } = req.body;

    if (!clientId || !serviceId || !date || !startTime)
      return res.status(400).json({ message: "Missing required fields" });

    // Check client status
    const client = await ClientModel.findById(clientId);
    if (!client || client.status !== "active")
      return res.status(400).json({ message: "Client not active or not found" });

    // Check service availability
    const service = await ServiceModel.findById(serviceId);
    if (!service || service.status !== "available")
      return res.status(400).json({ message: "Service unavailable" });

    // Get settings (rooms, hours)
    const settings = await SpaSettingsModel.findOne();
    if (!settings)
      return res.status(500).json({ message: "Settings not configured" });

    // Compute start & end in minutes
    const startMin = toMinutes(startTime);
    const endMin = startMin + service.duration;
    const openMin = toMinutes(settings.openingTime);
    const closeMin = toMinutes(settings.closingTime);

    // Convert back to HH:mm string
    const pad = (n: number) => String(n).padStart(2, "0");
    const hours = Math.floor(endMin / 60) % 24;
    const mins = endMin % 60;
    const endTime = `${pad(hours)}:${pad(mins)}`;

    // Validate time slot within open hours
    if (startMin < openMin || endMin > closeMin)
      return res.status(400).json({ message: "Outside operating hours" });

    // Check overlapping bookings
    const existingAppointments = await AppointmentModel.find({
      date,
      status: { $in: ["Pending", "Approved", "Rescheduled"] },
    });

    let overlapCount = 0;
    for (const appt of existingAppointments) {
      if (isOverlapping(startTime, endTime, appt.startTime, appt.endTime)) {
        overlapCount++;
      }
    }

    if (overlapCount >= settings.totalRooms) {
      return res.status(400).json({ message: "All rooms are booked for this time slot" });
    }

    const totalPrice = service.price;
    const newAppointment = await AppointmentModel.create({
      clientId,
      serviceId,
      date,
      startTime,
      endTime,
      status: "Pending",
      modeOfPayment,
      totalPrice,
      notes,
    });

    res.status(201).json({
      message: "Appointment created successfully",
      appointment: newAppointment,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const updateAppointment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const updates = req.body;

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
		const { date, startTime } = req.body;

		if (!date || !startTime)
			return res.status(400).json({ message: "Date and start time are required" });

		const appointment = await AppointmentModel.findById(id);
		if (!appointment)
			return res.status(404).json({ message: "Appointment not found" });

		const service = await ServiceModel.findById(appointment.serviceId);
		if (!service)
			return res.status(400).json({ message: "Service not found" });

		const settings = await SpaSettingsModel.findOne();
		if (!settings)
			return res.status(500).json({ message: "Settings not configured" });

		// compute new end time based on service duration
		const startMin = toMinutes(startTime);
		const endMin = startMin + service.duration;
		const openMin = toMinutes(settings.openingTime);
		const closeMin = toMinutes(settings.closingTime);

		// convert back to HH:mm
		const pad = (n: number) => String(n).padStart(2, "0");
		const endTime = `${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}`;

		// Validate within open hours
		if (startMin < openMin || endMin > closeMin)
			return res.status(400).json({ message: "Outside operating hours" });

		// Check overlapping appointments
		const existingAppointments = await AppointmentModel.find({
			date,
			status: { $in: ["Pending", "Approved", "Rescheduled"] },
			_id: { $ne: id },
		});

		let overlapCount = 0;
		for (const appt of existingAppointments) {
			if (isOverlapping(startTime, endTime, appt.startTime, appt.endTime)) {
				overlapCount++;
			}
		}

		if (overlapCount >= settings.totalRooms)
			return res.status(400).json({ message: "All rooms booked for that slot" });

		appointment.date = date;
		appointment.startTime = startTime;
		appointment.endTime = endTime;
		appointment.status = "Rescheduled";
		await appointment.save();

		res.status(200).json({
			message: "Appointment rescheduled successfully",
			appointment,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};


export const completeAppointment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const appointment = await AppointmentModel.findById(id);
		if (!appointment) return res.status(404).json({ message: "Appointment not found" });

		if (appointment.status !== "Approved" && appointment.status !== "Rescheduled") {
			return res.status(400).json({ message: "Only approved appointments can be marked as completed" });
		}

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
		const filter: Record<string, any> = {};

		if (status) filter.status = status;
		if (date) filter.date = new Date(date as string);
		if (clientId) filter.clientId = clientId;

		const appointments = await AppointmentModel.find(filter)
			.populate("clientId", "firstname lastname email phone")
			.populate("serviceId", "name price duration category");

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
			.populate("serviceId", "name price duration category");

		if (!appointment) {
			return res.status(404).json({ message: "Appointment not found" });
		}

		res.status(200).json({ appointment });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};

export const getClientAppointments = async (req: Request, res: Response) => {
	try {
		const { clientId } = req.params;

		const appointments = await AppointmentModel.find({ clientId })
			.populate("serviceId", "name price duration category status")
			.sort({ date: -1 });

		if (!appointments.length) {
			return res.status(404).json({ message: "No appointments found for this client" });
		}

		res.status(200).json({ count: appointments.length, appointments });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
};
