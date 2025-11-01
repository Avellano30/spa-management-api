import express from 'express';
import auth from './auth';
import client from './client';
import service from './service';

const router = express.Router();

export default (): express.Router => {
    auth(router);
    client(router);
    service(router);
    
    return router;
}