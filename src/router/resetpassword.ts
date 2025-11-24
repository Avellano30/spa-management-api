import express from 'express';
import { requestPasswordReset, resetPassword, verifyResetPasswordToken } from '../controller/resetpassword';

export default (router: express.Router) => {
    router.post("/password-reset", requestPasswordReset);
    router.get("/password-reset/verify/:token", verifyResetPasswordToken);
    router.post("/password-reset/:token", resetPassword);
}