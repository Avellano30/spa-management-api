import express from 'express';
import auth from './auth';
import client from './client';
import service from './service';
import appointment from './appointment';
import settings from './settings';
import payment from './payment';
import emailVerification from './emailVerification';
import reset_password from './reset_password';

const router = express.Router();

export default (): express.Router => {
    auth(router);
    client(router);
    service(router);
    appointment(router);
    settings(router);
    payment(router);
    reset_password(router);
    emailVerification(router);
    
    return router;
}