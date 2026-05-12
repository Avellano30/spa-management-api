import axios from "axios";
import { HomepageModel } from "../schema/homepage";

export const sendEmail = async (to: string, subject: string, html: string, name: string) => {
    // Fetch spa name dynamically
    const settings = await HomepageModel.findOne();
    const senderName = settings?.brand.name || "Serenity Spa"; // fallback

    await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
            sender: { name: senderName, email: process.env.SMTP_FROM },
            to: [{ email: to, name }],
            subject,
            htmlContent: html,
        },
        {
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "Content-Type": "application/json",
            },
        }
    );
};