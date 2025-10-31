import express from 'express';
import auth from './auth';
import client from './client';

const router = express.Router();

export default (): express.Router => {
    auth(router);
    client(router);
    
    return router;
}