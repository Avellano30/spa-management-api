import { Request, Response } from "express";
import { AppointmentModel } from "../schema/appointment";
import { ClientModel } from "../schema/client";
import { ServiceModel } from "../schema/service";
import { SpaSettingsModel } from "../schema/settings";
import { toHHMM, toMinutes } from "../helpers/timeUtils";
import { EmployeeModel } from "../schema/employee";
import axios from "axios";
import { PaymentModel } from "../schema/payment";

const TEMP_APPT_LIFETIME_MS = 10 * 60 * 1000;

export const createAppointment = async (req: Request, res: Response) => {
    try {
        const { clientId, services, date, startTime, notes, isTemporary, employee } = req.body;

        if (!clientId || !services || !Array.isArray(services) || services.length === 0 || !date || !startTime) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const client = await ClientModel.findById(clientId);
        if (!client) return res.status(404).json({ message: "Client not found" });
        if (["banned", "inactive"].includes(client.status)) {
            return res.status(403).json({ message: "Account is restricted." });
        }

        const pendingCount = await AppointmentModel.countDocuments({
            clientId,
            status: "Pending",
            isTemporary: { $ne: true },
        });
        if (pendingCount >= 2) {
            return res.status(400).json({ message: "You already have 2 pending appointments." });
        }

        const validatedServices = [];
        let totalDuration = 0;
        for (const serviceItem of services) {
            const service = await ServiceModel.findById(serviceItem.serviceId);
            if (!service || service.status !== "available") return res.status(400).json({ message: "Service unavailable" });

            validatedServices.push({
                serviceId: serviceItem.serviceId,
                intensity: serviceItem.intensity || service.intensity,
                service: { ...service.toObject(), price: service.price },
            });
            totalDuration += service.duration;
        }

        const settings = await SpaSettingsModel.findOne();
        if (!settings) return res.status(500).json({ message: "Settings not configured" });

        const startMin = toMinutes(startTime);
        const endMin = startMin + totalDuration;
        const endTime = toHHMM(endMin);
        const openMin = toMinutes(settings.openingTime);
        const closeMin = toMinutes(settings.closingTime);

        const isValidHours = closeMin > openMin ? (startMin >= openMin && endMin <= closeMin) : (startMin >= openMin || endMin <= closeMin);
        if (!isValidHours) return res.status(400).json({ message: "Outside operating hours" });

        // --- THERAPIST BUSY CHECK ---
        if (employee) {
            const therapistConflict = await AppointmentModel.findOne({
                employee,
                date,
                status: { $in: ["Approved", "Rescheduled", "Pending"] },
                isTemporary: { $ne: true },
                startTime: { $lt: endTime },
                endTime: { $gt: startTime },
            });
            if (therapistConflict) return res.status(400).json({ message: "The selected therapist is already busy at this time." });
        }

        const roomOverlap = await AppointmentModel.countDocuments({
            date,
            status: { $in: ["Approved", "Rescheduled", "Pending"] },
            isTemporary: { $ne: true },
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
        });
        if (roomOverlap >= settings.totalRooms) return res.status(400).json({ message: "All rooms are booked." });

        const appointmentData: any = {
            clientId, services: validatedServices, date, startTime, endTime, notes, status: "Pending", isTemporary, employee,
        };
        if (isTemporary) appointmentData.expiresAt = new Date(Date.now() + TEMP_APPT_LIFETIME_MS);

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

        const updated = await AppointmentModel.findByIdAndUpdate(
            id,
            updates,
            { new: true }
        )
            .populate("services.serviceId")
            .populate("employee")
            .populate("payments");

        if (!updated) return res.status(404).json({ message: "Appointment not found" });

        res.status(200).json({ message: "Appointment updated", appointment: updated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const approveAppointment = async (req: Request, res: Response) => {
    try {
        const updated = await AppointmentModel.findByIdAndUpdate(
            req.params.id,
            { status: "Approved", isTemporary: false, $unset: { expiresAt: "" } },
            { new: true }
        )
            .populate("services.serviceId")
            .populate("employee")
            .populate("payments"); // 👈 ADD THIS

        res.status(200).json({ message: "Approved", appointment: updated });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const cancelAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes, isAdmin } = req.body;
        if (!notes) return res.status(400).json({ message: "Cancellation notes are required." });
        const appointment = await AppointmentModel.findById(id).populate("payments");
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        if (String(isAdmin) === 'true') {
            const payment = (appointment as any).payments?.find((p: any) => p.status === "Completed" || p.status === "paid");
            if (payment) {
                const total = appointment.services.reduce((acc, curr) => acc + (curr.service.price || 0), 0);
                const refundRes = await axios.post('https://api.paymongo.com/v1/refunds', {
                    data: { attributes: { amount: total * 100, payment_id: payment.transactionId || payment.paymentId, reason: 'others', notes: `Admin Cancel: ${notes}` } }
                }, {
                    headers: { Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}` }
                });
                const refundRecord = await PaymentModel.create({
                    appointmentId: id, amount: -total, method: "Online", type: "Refund", status: "Completed", transactionId: refundRes.data.data.id, remarks: `Refund: ${notes}`
                });
                await AppointmentModel.findByIdAndUpdate(id, { $push: { payments: refundRecord._id } });
                appointment.status = "Refunded";
            } else {
                appointment.status = "Cancelled";
            }
        } else {
            appointment.status = "Cancelled";
        }
        appointment.notes = notes;
        await appointment.save();
        const finalAppt = await AppointmentModel.findById(id)
            .populate("services.serviceId")
            .populate("employee")
            .populate("payments");
        res.status(200).json({ message: "Appointment processed", appointment: finalAppt });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const rescheduleAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, startTime, notes } = req.body;
        if (!date || !startTime) return res.status(400).json({ message: "Date and time required" });
        const appointment = await AppointmentModel.findById(id);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        let totalDuration = 0;
        for (const item of appointment.services) {
            const s = await ServiceModel.findById(item.serviceId);
            if (s) totalDuration += s.duration;
        }

        const startMin = toMinutes(startTime);
        const endMin = startMin + totalDuration;
        const endTime = toHHMM(endMin);

        if (appointment.employee) {
            const employee = await EmployeeModel.findById(appointment.employee);
            if (employee) {
                const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
                if (!employee.schedule?.some((d: string) => d.toLowerCase() === dayOfWeek)) {
                    return res.status(400).json({ message: `${employee.name} does not work on ${dayOfWeek}.` });
                }
                const conflict = await AppointmentModel.findOne({
                    employee: appointment.employee, _id: { $ne: id }, date,
                    status: { $in: ["Approved", "Rescheduled", "Pending"] },
                    startTime: { $lt: endTime }, endTime: { $gt: startTime },
                });
                if (conflict) return res.status(400).json({ message: "Therapist is busy at this new time." });
            }
        }

        const settings = await SpaSettingsModel.findOne();
        const roomOverlap = await AppointmentModel.countDocuments({
            date, _id: { $ne: id }, status: { $in: ["Approved", "Rescheduled", "Pending"] },
            startTime: { $lt: endTime }, endTime: { $gt: startTime },
        });
        if (settings && roomOverlap >= settings.totalRooms) return res.status(400).json({ message: "All rooms full." });

        appointment.date = date; appointment.startTime = startTime; appointment.endTime = endTime;
        appointment.status = "Rescheduled";
        if (notes) appointment.notes = notes;
        await appointment.save();
        res.status(200).json({ message: "Rescheduled successfully", appointment });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const completeAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const appointment = await AppointmentModel.findById(id);

        if (!appointment || !["Approved", "Rescheduled"].includes(appointment.status)) {
            return res.status(400).json({ message: "Invalid appointment status for completion" });
        }

        appointment.status = "Completed";
        await appointment.save();

        // 🔥 Final re-fetch to ensure payments/remarks show up in the UI immediately
        const finalAppt = await AppointmentModel.findById(id)
            .populate("services.serviceId")
            .populate("employee")
            .populate("payments");

        res.status(200).json({ message: "Completed", appointment: finalAppt });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAppointments = async (req: Request, res: Response) => {
    try {
        const { status, date, clientId } = req.query;
        const filter: any = { isTemporary: false };
        if (status) filter.status = status;
        if (date) filter.date = new Date(date as string);
        if (clientId) filter.clientId = clientId;

        const appointments = await AppointmentModel.find(filter)
            .populate("clientId", "firstname lastname email phone")
            .populate({ path: "services.serviceId", model: "Service" })
            .populate({ path: "employee", model: "Employee" })
            .populate("payments").sort({ createdAt: -1 });
        res.status(200).json({ count: appointments.length, appointments });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getAppointmentById = async (req: Request, res: Response) => {
    try {
        const appointment = await AppointmentModel.findById(req.params.id)
            .populate("clientId").populate("services.serviceId").populate("employee");
        if (!appointment) return res.status(404).json({ message: "Not found" });
        res.status(200).json({ appointment });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getClientAppointments = async (req: Request, res: Response) => {
    try {
        const appointments = await AppointmentModel.find({ clientId: req.params.clientId, isTemporary: false })
            .populate("services.serviceId").populate("employee").populate("payments").sort({ date: -1 });
        res.status(200).json({ count: appointments.length, appointments });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const deleteTemporaryAppointment = async (req: Request, res: Response) => {
    try {
        await AppointmentModel.findOneAndDelete({ _id: req.params.id, isTemporary: true });
        res.json({ message: "Deleted" });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
};

export const refundAppointment = async (req: Request, res: Response) => {
    try {
        const appointment = await AppointmentModel.findById(req.params.id).populate("payments");
        if (!appointment) return res.status(404).json({ message: "Not found" });
        appointment.status = "Refunded";
        await appointment.save();
        res.status(200).json({ message: "Refunded", appointment });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};