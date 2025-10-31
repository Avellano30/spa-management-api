import express from 'express';

import { signIn, signUp } from '../controller/auth';

export default (router: express.Router) => {
    /**
     * @openapi
     * /auth/google:
     *   post:
     *     summary: Sign in with Google OAuth2
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               code:
     *                 type: string
     *                 description: Google authorization code
     *     responses:
     *       200:
     *         description: Successful login
     *       400:
     *         description: Invalid request
     */
    router.post('/auth/google', signIn);

    /**
     * @openapi
     * /sign-up:
     *   post:
     *     summary: Register a new Admin account
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               firstname: { type: string }
     *               lastname: { type: string }
     *               username: { type: string }
     *               email: { type: string }
     *               password: { type: string }
     *     responses:
     *       200:
     *         description: Signup successful
     *       400:
     *         description: Invalid input or duplicate
     */
    router.post('/sign-up', signUp);

}