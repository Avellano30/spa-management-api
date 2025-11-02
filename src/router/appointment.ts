import express from "express";
import {
	createAppointment,
	getAppointments,
	getAppointmentById,
	getClientAppointments,
	updateAppointment,
	approveAppointment,
	cancelAppointment,
	rescheduleAppointment,
	completeAppointment,
} from "../controller/appointment";

export default (router: express.Router) => {
	router.post("/appointment", createAppointment);
	router.get("/appointment", getAppointments);
	router.get("/appointment/:id", getAppointmentById);
	router.get("/appointment/client/:clientId", getClientAppointments);
	router.patch("/appointment/:id", updateAppointment);
	router.patch("/appointment/:id/approve", approveAppointment);
	router.patch("/appointment/:id/cancel", cancelAppointment);
	router.patch("/appointment/:id/reschedule", rescheduleAppointment);
	router.patch("/appointment/:id/complete", completeAppointment);
}