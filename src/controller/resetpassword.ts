import { Request, Response } from "express";
import { ClientModel } from "../schema/client";
import crypto from "crypto";
import { transporter } from "../config/nodemailer";
import { ResetPasswordEmail } from "../templates/email/resetPassword";

// ------------------------------
// UTILITIES
// ------------------------------

const random = () => crypto.randomBytes(128).toString("base64");

const hashPassword = (salt: string, password: string) => {
  return crypto
    .createHmac("sha256", [salt, password].join("/"))
    .update(`${process.env.PASSWORD_SECRET}`)
    .digest("hex");
};

// ------------------------------
// TOKEN GENERATION
// ------------------------------

export const generateResetPasswordToken = async (clientId: string) => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  await ClientModel.findByIdAndUpdate(clientId, {
    resetPasswordToken: hashedToken,
    resetPasswordExpires: Date.now() + 1000 * 60 * 15, // 15 min
  });

  return rawToken;
};

export const validateResetToken = async (token: string) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  return await ClientModel.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires");
};

// ------------------------------
// EMAIL SENDER USING BREVO
// ------------------------------

export const sendResetPasswordEmail = async (email: string, name: string, link: string) => {
  const html = ResetPasswordEmail({ name, link });

  await transporter.sendMail({
    from: "eliaschan989@gmail.com",
    to: email,
    subject: "Reset Your Password",
    html,
  });
};

// ------------------------------
// CONTROLLERS
// ------------------------------

// STEP 1: Request reset email
export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  const client = await ClientModel.findOne({ email });
  if (!client) return res.status(404).json({ message: "Email not found" });

  const token = await generateResetPasswordToken(client.id.toString());

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  await sendResetPasswordEmail(client.email, client.firstname, resetLink);

  return res.json({ message: "Reset email sent" });
};

// STEP 2: Verify token (frontend check)
export const verifyResetPasswordToken = async (req: Request, res: Response) => {
  const { token } = req.params;

  const client = await validateResetToken(token);
  if (!client) return res.status(400).json({ message: "Invalid or expired token" });

  return res.json({ valid: true });
};

// STEP 3: Reset password
export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  const client = await validateResetToken(token);
  if (!client) return res.status(400).json({ message: "Invalid or expired token" });

  const salt = random();
  const hashed = hashPassword(salt, password);

  await ClientModel.findByIdAndUpdate(client._id, {
    "authentication.salt": salt,
    "authentication.password": hashed,
    resetPasswordToken: undefined,
    resetPasswordExpires: undefined,
  });

  return res.json({ message: "Password reset successful" });
};
