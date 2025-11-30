import express from 'express';
import { sendVerificationEmail, verifyEmail } from '../controller/emailverification';

export default (router: express.Router) => {
    router.post("/send-verification", sendVerificationEmail);
    router.get("/verify-email", verifyEmail);
}