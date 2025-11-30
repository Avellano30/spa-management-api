// src/controllers/emailVerificationController.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { ClientModel } from "../schema/client";
import { transporter } from "../config/nodemailer";

/**
 * Send verification email to user
 */
export const sendVerificationEmail = async (req: Request, res: Response) => {
	const { email } = req.body;

	if (!email) return res.status(400).json({ message: "Email is required" });

	const user = await ClientModel.findOne({ email });
	if (!user) return res.status(404).json({ message: "User not found" });

	// Generate verification token
	const token = crypto.randomBytes(32).toString("hex");
	const expires = new Date();
	expires.setHours(expires.getHours() + 24); // token valid for 24h

	user.verificationToken = token;
	user.verificationExpires = expires;
	await user.save();

	// Construct verification link
	const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`;

	const mailOptions = {
		from: `"Serenity Spa" <${process.env.SMTP_USER}>`,
		to: email,
		subject: "Verify Your Email",
		html: `
			<h2>Email Verification</h2>
			<p>Hi ${user.firstname},</p>
			<p>Click the link below to verify your email:</p>
			<a href="${verificationUrl}">${verificationUrl}</a>
			<p>This link expires in 24 hours.</p>
		`,
	};

	try {
		await transporter.sendMail(mailOptions);
		res.status(200).json({ message: "Verification email sent" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to send verification email" });
	}
};

/**
 * Verify user's email
 */
export const verifyEmail = async (req: Request, res: Response) => {
	const { token, email } = req.query;

	if (!token || !email) return res.status(400).json({ message: "Invalid request" });

	const user = await ClientModel.findOne({
		email: email as string,
		verificationToken: token as string,
		verificationExpires: { $gt: new Date() }, // token not expired
	});

	if (!user) return res.status(400).json({ message: "Invalid or expired token" });

	user.verified = true;
	user.verificationToken = undefined;
	user.verificationExpires = undefined;

	await user.save();

	res.status(200).json({ message: "Email verified successfully" });
};
