import express from 'express';
import auth from './auth';
import client from './client';
import service from './service';
import appointment from './appointment';
import settings from './settings';
import payment from './payment';
import resetPassword from './resetPassword';
import emailVerification from './emailVerification';

const router = express.Router();

export default (): express.Router => {
    auth(router);
    client(router);
    service(router);
    appointment(router);
    settings(router);
    payment(router);
    resetPassword(router);
    emailVerification(router);
    
    return router;
}