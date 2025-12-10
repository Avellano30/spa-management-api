import express from 'express';
import { resendVerificationEmail, verifyEmail } from '../controller/emailVerification';

export default (router: express.Router) => {
    router.post("/resend-verification", resendVerificationEmail);
    router.get("/verify-email/:token", verifyEmail);
}