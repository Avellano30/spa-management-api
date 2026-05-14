import express from 'express';
import { clientSignIn, clientSignUp, deleteClient, getClients, getClient, updateClient } from '../controller/client';

export default (router: express.Router) => {
    router.post("/client/auth/google", clientSignIn);
    router.post("/client/sign-up", clientSignUp);
    router.get("/client/records", getClients);
    router.get("/client/record/:id", getClient);
    router.patch("/client/record/:id", updateClient);
    router.delete("/client/record/:id", deleteClient);
}