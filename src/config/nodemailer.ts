import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

// Create Nodemailer transporter for Brevo
export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
    },
} as SMTPTransport.Options);