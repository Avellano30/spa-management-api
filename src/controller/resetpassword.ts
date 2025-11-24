import { Request, Response } from "express";
import { ClientModel } from "../schema/client";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

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
// EMAIL SENDER USING RESEND
// ------------------------------

export const sendResetPasswordEmail = async (email: string, name: string, link: string) => {
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
    <h2 style="color: #e50914; text-align: center;">Hello ${name},</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #333;">
      You requested a password reset for your SPA account.
    </p>
    <p style="font-size: 16px; line-height: 1.5; color: #333;">
      Click the button below to reset your password:
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a 
        href="${link}" 
        style="display: inline-block; padding: 12px 20px; background-color: #3b82f6; color: #ffffff; font-weight: bold; text-decoration: none; border-radius: 6px; font-size: 16px;"
      >
        Reset Password
      </a>
    </div>
    <p style="font-size: 14px; color: #555; line-height: 1.5;">
      This link will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.
    </p>
    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e0e0e0;" />
    <p style="font-size: 12px; color: #888; text-align: center;">
      SPA Management System &copy; ${new Date().getFullYear()}
    </p>
  </div>
`;


  await resend.emails.send({
    from: "delivered+password-reset@resend.dev",
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
