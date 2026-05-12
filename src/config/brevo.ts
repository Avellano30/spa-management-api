import axios from "axios";
import { HomepageModel } from "../schema/homepage";

export const getSpaName = async (): Promise<string> => {
    const settings = await HomepageModel.findOne();
    return settings?.brand.name || "Serenity Spa";
};

export const sendEmail = async (to: string, subject: string, html: string, name: string) => {
    const settings = await HomepageModel.findOne();
    const spaName = settings?.brand.name || "Serenity Spa";

    await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
            sender: { name: spaName, email: process.env.SMTP_FROM },
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