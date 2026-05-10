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
    const appointment = await AppointmentModel.findById(appointmentId).populate(
      {
        path: "services.serviceId",
        model: "Service",
      },
    );
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    const settings = await SpaSettingsModel.findOne();
    if (!settings)
      return res
        .status(404)
        .json({ message: "Settings for downpayment not found" });

    // Calculate total price from all services
    const totalPrice = appointment.services.reduce(
      (sum: number, serviceItem: any) => {
        return sum + serviceItem.service.price;
      },
      0,
    );

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

    // Create line items for each service, distributing the payment amount proportionally
    const lineItems = appointment.services.map((serviceItem: any) => {
      const servicePrice = serviceItem.service.price;
      const proportion = servicePrice / totalPrice;
      const itemAmount = Math.round(amount * proportion);

      return {
        price_data: {
          currency: "php",
          product_data: {
            name: `${serviceItem.service.name} (${type} Payment)`,
            images: serviceItem.service.imageUrl
              ? [serviceItem.service.imageUrl]
              : [],
          },
          unit_amount: itemAmount * 100, // in cents
        },
        quantity: 1,
      };
    });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
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

    const payment = await PaymentModel.create({
      appointmentId,
      amount,
      method: "Online",
      type,
      status: "Completed",
      transactionId: session.id,
    });

    // Add payment to appointment's payments array
    await AppointmentModel.findByIdAndUpdate(appointmentId, {
      $push: { payments: payment._id },
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
      .populate({
        path: "services.serviceId",
        model: "Service",
      });

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

    // Add payment to appointment's payments array
// Add payment to appointment's payments array
      await AppointmentModel.findByIdAndUpdate(appointmentId, {
          $push: { payments: payment._id },
      });

// 🔥 CHANGE: Fetch the payment again but with all fields, or just ensure
// the client-side 'load()' function is called after this returns.
      res.status(201).json({
          message: "Cash payment recorded successfully",
          payment: payment, // Ensure this contains the 'remarks' field you just saved
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
      .populate({
        path: "services.serviceId",
        model: "Service",
      })
      .populate("clientId");
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    const settings = await SpaSettingsModel.findOne();
    if (!settings)
      return res
        .status(404)
        .json({ message: "Settings for downpayment not found" });

    const client = appointment.clientId as any;
    // Calculate total price from all services
    const totalPrice = appointment.services.reduce(
      (sum: number, serviceItem: any) => {
        return sum + serviceItem.service.price;
      },
      0,
    );

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

    // Create line items for each service, distributing the payment amount proportionally
    const lineItems = appointment.services.map((serviceItem: any) => {
      const servicePrice = serviceItem.service.price;
      const proportion = servicePrice / totalPrice;
      const itemAmount = Math.round(amount * proportion * 100); // Convert to cents

      return {
        currency: "PHP",
        amount: itemAmount,
        name: `${serviceItem.service.name} (${type} Payment)`,
        quantity: 1,
      };
    });

    // Call PayMongo API to create checkout session for GCash
    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            payment_method_types: ["gcash", "paymaya"],
            external_reference_number: appointmentId,
            description: `Payment for ${appointment.services.map((s: any) => s.service.name).join(", ")} (${type})`,
            metadata: { type, appointmentId },
            billing: {
              name: client.firstname + " " + client.lastname,
              email: client.email,
              phone: client.phone,
            },
            line_items: lineItems,
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

    const payment = await PaymentModel.create({
      appointmentId: metadata.appointmentId,
      amount,
      method: "Online",
      type: metadata.type,
      status: "Completed",
      transactionId: session.id,
    });

    // Add payment to appointment's payments array
    await AppointmentModel.findByIdAndUpdate(metadata.appointmentId, {
      $push: { payments: payment._id },
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

export const createPaymongoRefund = async (req: Request, res: Response) => {
  try {
    const { id: appointmentId } = req.params;
    const { amount, reason } = req.body;
    if (!appointmentId || !amount) {
      return res.status(400).json({
        message: "Appointment ID and refund amount are required",
      });
    }

    // Check if appointment exists
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Check if appointment has completed payments
    const completedPayments = await PaymentModel.find({
      appointmentId,
      status: "Completed",
      method: "Online", // Only online payments can be refunded via PayMongo
    });

    if (completedPayments.length === 0) {
      return res.status(400).json({
        message: "No completed online payments found for this appointment",
      });
    }

    // Calculate total paid amount
    const totalPaid = completedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    // Check if refund amount is valid
    if (amount > totalPaid) {
      return res.status(400).json({
        message: `Refund amount (${amount}) cannot exceed total paid amount (${totalPaid})`,
      });
    }

    for (const payment of completedPayments) {
      const refundResponse = await axios.post(
        "https://api.paymongo.com/v1/refunds",
        {
          data: {
            attributes: {
              amount: payment.amount * 100,
              payment_id: payment.transactionId,
              reason: "requested_by_customer",
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

      // Record the refund in database
      const refund = await PaymentModel.create({
        appointmentId,
        amount: -amount, // Negative amount for refund
        method: "Online",
        type: "Refund",
        status: "Completed",
        transactionId: refundResponse.data.data.id,
        remarks: reason || "Refund processed via PayMongo",
      });

      // Add refund to appointment's payments array
      await AppointmentModel.findByIdAndUpdate(appointmentId, {
        $push: { payments: refund._id },
      });

      // Record each refund in DB as you already do
    }

    res.status(200).json({
      message: "Refund processed successfully",
    });
  } catch (error: any) {
    console.error(
      "PayMongo refund error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      message: "Failed to process refund",
      error: error.response?.data?.errors || error.message,
    });
  }
};
