export interface EmailVerificationProps {
  name: string;
  link: string;
}

export const EmailVerification = ({ name, link }: EmailVerificationProps) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1c7ed6; text-align: center;">Verify Your Email</h2>
  
  <p style="font-size: 16px; line-height: 1.5; color: #333;">
    Hello ${name},
  </p>

  <p style="font-size: 16px; line-height: 1.5; color: #333;">
    Thank you for registering with <strong>Serenity Spa</strong>. To complete your registration and activate your account, please verify your email address by clicking the button below:
  </p>

  <div style="text-align: center; margin: 20px 0;">
    <a 
      href="${link}" 
      style="display: inline-block; padding: 12px 20px; background-color: #1c7ed6; color: #ffffff; font-weight: bold; text-decoration: none; border-radius: 6px; font-size: 16px;"
    >
      Verify Email
    </a>
  </div>

  <p style="font-size: 14px; color: #555; line-height: 1.5;">
    This verification link will expire in 24 hours. If you did not create an account with us, please ignore this email.
  </p>

  <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e0e0e0;" />

  <p style="font-size: 12px; color: #888; text-align: center;">
    Serenity Spa &copy; ${new Date().getFullYear()}
  </p>
</div>
`;
