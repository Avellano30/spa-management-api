import { Request, Response } from "express";
import Stripe from "stripe";
import { AppointmentModel } from "../schema/appointment";
import { PaymentModel } from "../schema/payment";
import { randomBytes } from "crypto";
import { SpaSettingsModel } from "../schema/settings";
import axios from "axios";
import app from "../app";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const createPaymentSession = async (req: Request, res: Response) => {
  try {
    const { appointmentId, type } = req.body;
    const appointment =
      await AppointmentModel.findById(appointmentId).populate("serviceId");
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    const settings = await SpaSettingsModel.findOne();
    if (!settings)
      return res
        .status(404)
        .json({ message: "Settings for downpayment not found" });

    const service = appointment.serviceId as any;
    const totalPrice = service.price;

    // Determine payment amount
    let amount = totalPrice;
    if (type === "Downpayment")
      amount = totalPrice * (settings.downPayment / 100); // 30% default downpayment
    else if (type === "Balance") {
      // compute remaining balance based on total paid
      const payments = await PaymentModel.find({
        appointmentId,
        status: "Completed",
      });
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      amount = Math.max(totalPrice - totalPaid, 0);
    }

    if (amount <= 0)
      return res
        .status(400)
        .json({ message: "Appointment already fully paid" });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "php",
            product_data: {
              name: `${service.name} (${type} Payment)`,
              images: service.imageUrl ? [service.imageUrl] : [],
            },
            unit_amount: Math.round(amount * 100), // in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
      metadata: { appointmentId, type },
    });

    res.status(200).json({
      message: "Stripe session created",
      url: session.url,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret!);
  } catch (err: any) {
    console.error("⚠️ Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const { appointmentId, type } = session.metadata;
    const amount = session.amount_total / 100;

    await PaymentModel.create({
      appointmentId,
      amount,
      method: "Online",
      type,
      status: "Completed",
      transactionId: session.id,
    });

    // Update appointment status based on type
    if (["Full", "Downpayment"].includes(type)) {
      await AppointmentModel.findByIdAndUpdate(appointmentId, {
        status: "Approved",
        isTemporary: false,
        $unset: { expiresAt: "" },
      });
    } else if (type === "Balance") {
      await AppointmentModel.findByIdAndUpdate(appointmentId, {
        status: "Completed",
      });
    }
  }

  res.json({ received: true });
};

export const createCashPayment = async (req: Request, res: Response) => {
  try {
    const { appointmentId, type, amount, remarks } = req.body;

    const appointment = await AppointmentModel.findById(appointmentId)
      .populate("clientId")
      .populate("serviceId");

    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });
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

    res.status(201).json({
      message: "Cash payment recorded successfully",
      payment,
    });
  } catch (error: any) {
    console.error("Error creating cash payment:", error.message);
    res.status(500).json({ message: error.message });
  }
};

//create gcash payment session
export const createPaymongoPaymentSession = async (
  req: Request,
  res: Response,
) => {
  try {
    const { type, appointmentId } = req.body;

    const appointment = await AppointmentModel.findById(appointmentId)
      .populate("serviceId")
      .populate("clientId");
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    const settings = await SpaSettingsModel.findOne();
    if (!settings)
      return res
        .status(404)
        .json({ message: "Settings for downpayment not found" });

    const service = appointment.serviceId as any;
    const client = appointment.clientId as any;
    const totalPrice = service.price;

    // Determine payment amount
    let amount = totalPrice;
    if (type === "Downpayment")
      amount = totalPrice * (settings.downPayment / 100); // 30% default downpayment
    else if (type === "Balance") {
      // compute remaining balance based on total paid
      const payments = await PaymentModel.find({
        appointmentId,
        status: "Completed",
      });
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      amount = Math.max(totalPrice - totalPaid, 0);
    }

    if (amount <= 0)
      return res
        .status(400)
        .json({ message: "Appointment already fully paid" });

    // Call PayMongo API to create checkout session for GCash
    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            payment_method_types: ["gcash", "paymaya", "card"],
            external_reference_number: appointmentId,
            description: `Payment for ${service.name} (${type})`,
            metadata: { type, appointmentId },
            billing: {
              name: client.firstname + " " + client.lastname,
              email: client.email,
              phone: client.phone,
            },
            line_items: [
              {
                currency: "PHP",
                amount: amount * 100, // Convert to cents
                name: service.name + ` (${type} Payment)`,
                quantity: 1,
              },
            ],
            success_url: `${process.env.FRONTEND_URL}/payment-success`,
            cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64",
            ),
        },
      },
    );

    res.json({
      checkout_url: response.data.data.attributes.checkout_url,
    });
  } catch (error: any) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Payment failed" });
  }
};

// Create webbook endpoint for PayMongo (to be called by PayMongo when payment is completed)

export const paymongoWebhook = async (req: Request, res: Response) => {
  const event = req.body;

  if (event.data.attributes.type === "payment.paid") {
    console.log("✅ PayMongo Payment successful");
    console.log("Payment details:", event.data.attributes.data);

    const session = event.data.attributes.data as any;
    const metadata = session.attributes.metadata;
    const amount = session.attributes.amount / 100;

    await PaymentModel.create({
      appointmentId: metadata.appointmentId,
      amount,
      method: "Online",
      type: metadata.type,
      status: "Completed",
      transactionId: session.id,
    });

    // Update appointment status based on type
    if (["Full", "Downpayment"].includes(metadata.type)) {
      await AppointmentModel.findByIdAndUpdate(metadata.appointmentId, {
        status: "Approved",
        isTemporary: false,
        $unset: { expiresAt: "" },
      });
    } else if (metadata.type === "Balance") {
      await AppointmentModel.findByIdAndUpdate(metadata.appointmentId, {
        status: "Completed",
      });
    }
    res.sendStatus(200);
  }
};
