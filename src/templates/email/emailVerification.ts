export interface EmailVerificationProps {
    name: string;
    link: string;
    spaName: string;
}

export const EmailVerification = ({
                                      name,
                                      link,
                                      spaName,
                                  }: EmailVerificationProps) => `
<div style="margin:0; padding:40px 20px; background-color:#f4f7fb; font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb; box-shadow:0 4px 20px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background:linear-gradient(180deg,#1c7ed6,#1971c2); padding:36px 24px; text-align:center;">
      <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700;">
        Verify Your Email
      </h1>
      <p style="margin:12px 0 0; color:rgba(255,255,255,0.9); font-size:15px;">
        Welcome to ${spaName}
      </p>
    </div>

    <!-- Body -->
    <div style="padding:40px 32px;">

      <p style="margin:0 0 16px; font-size:18px; color:#111827; font-weight:600;">
        Hello ${name},
      </p>

      <p style="margin:0 0 20px; font-size:16px; line-height:1.7; color:#4b5563;">
        Thank you for registering with <strong>${spaName}</strong>.
      </p>

      <p style="margin:0 0 30px; font-size:16px; line-height:1.7; color:#4b5563;">
        To activate your account and start using the platform,
        please confirm your email address by clicking the button below.
      </p>

      <!-- CTA -->
      <div style="text-align:center; margin:32px 0;">
        <a
          href="${link}"
          target="_blank"
          rel="noopener noreferrer"
          style="display:inline-block; background:#1c7ed6; color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:10px; font-size:16px; font-weight:700; box-shadow:0 4px 12px rgba(28,126,214,0.25);"
        >
          Verify Email
        </a>
      </div>

      <!-- Fallback -->
   

      <!-- Verification Notice -->
      <div style="margin-top:28px; padding:18px; border-left:4px solid #10b981; background:#ecfdf5; border-radius:8px;">
        <p style="margin:0 0 8px; font-size:14px; font-weight:700; color:#065f46;">
          Verification Notice
        </p>
        <p style="margin:0; font-size:14px; line-height:1.6; color:#065f46;">
          This verification link will expire in <strong>24 hours</strong>.
          If you did not create an account with ${spaName},
          you can safely ignore this email.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding:24px; text-align:center; background:#f9fafb; border-top:1px solid #e5e7eb;">
      <p style="margin:0; font-size:13px; color:#9ca3af;">
        &copy; ${new Date().getFullYear()} ${spaName}. All rights reserved.
      </p>
    </div>

  </div>
</div>
`;