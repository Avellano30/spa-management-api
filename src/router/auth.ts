import express from 'express';

import { signIn, signUp } from '../controller/auth';

export default (router: express.Router) => {
    router.post('/auth/google', signIn);
    router.post('/sign-up', signUp);
}