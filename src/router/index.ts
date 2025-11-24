import express from 'express';
import auth from './auth';
import client from './client';
import service from './service';
import appointment from './appointment';
import settings from './settings';
import payment from './payment';
import resetpassword from './resetpassword';

const router = express.Router();

export default (): express.Router => {
    auth(router);
    client(router);
    service(router);
    appointment(router);
    settings(router);
    payment(router);
    resetpassword(router);
    
    return router;
}