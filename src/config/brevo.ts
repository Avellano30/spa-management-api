import axios from "axios";

export const sendEmail = async (to: string, subject: string, html: string, name: string) => {
    await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
            sender: { name: "Serenity Spa", email: process.env.SMTP_FROM },
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