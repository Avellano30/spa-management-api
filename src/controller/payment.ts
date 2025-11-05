import { Request, Response } from "express";
import Stripe from "stripe";
import { AppointmentModel } from "../schema/appointment";
import { PaymentModel } from "../schema/payment";
import { randomBytes } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const createPaymentSession = async (req: Request, res: Response) => {
    try {
        const { appointmentId, type } = req.body; // type: "Downpayment" | "Full"

        const appointment = await AppointmentModel.findById(appointmentId).populate("serviceId");
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        const service = appointment.serviceId as any;
        const totalPrice = service.price;

        const amount =
            type === "Downpayment" ? totalPrice * 0.3 : totalPrice; // 30% downpayment example

        // Create Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "php",
                        product_data: {
                            name: `${service.name} (${type} Payment)`,
                            images: [service.imageUrl]
                        },
                        unit_amount: Math.round(amount * 100), // in cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL}/payment-success`,
            cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
        });

        // Create Payment record (pending)
        const payment = await PaymentModel.create({
            appointmentId,
            amount,
            method: "Online",
            type,
            status: "Pending",
            transactionId: session.id,
        });

        res.status(200).json({
            message: "Stripe session created",
            url: session.url,
            payment,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const stripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
        event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret!);
    } catch (err: any) {
        console.error("⚠️ Webhook error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;

        const payment = await PaymentModel.findOne({ transactionId: session.id });
        if (payment) {
            payment.status = "Completed";
            await payment.save();

            if (payment.type === "Full" || payment.type === "Downpayment") {
                await AppointmentModel.findByIdAndUpdate(payment.appointmentId, {
                    status: "Approved",
                    isTemporary: false,
                });
            }
        }
    }

    res.json({ received: true });
};

const updateAppointmentStatus = async (appointmentId: string, type: string) => {
    const statusMap: Record<string, string> = {
        Downpayment: "Approved",
        Full: "Approved",
        Balance: "Completed",
        Refund: "Cancelled",
    };
    const status = statusMap[type];
    if (status) await AppointmentModel.findByIdAndUpdate(appointmentId, { status });
};

export const createCashPayment = async (req: Request, res: Response) => {
    try {
        const { appointmentId, type, amount, remarks } = req.body;

        const appointment = await AppointmentModel.findById(appointmentId)
            .populate("clientId")
            .populate("serviceId");

        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
        const randomPart = randomBytes(3).toString("hex").toUpperCase();
        const shortApptId = appointmentId.toString().slice(-6).toUpperCase();
        const transactionId = `CSH-${dateStr}-${shortApptId}-${randomPart}`;

        const payment = await PaymentModel.create({
            appointmentId,
            amount,
            method: "Cash",
            type,
            status: "Completed",
            transactionId,
            remarks: remarks || "",
        });

        await updateAppointmentStatus(appointmentId, type);

        res.status(201).json({
            message: "Cash payment recorded successfully",
            payment,
        });
    } catch (error: any) {
        console.error("Error creating cash payment:", error.message);
        res.status(500).json({ message: error.message });
    }
};