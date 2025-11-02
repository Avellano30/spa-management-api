import express from "express";
import { createCashPayment, createPaymentSession } from "../controller/payment";

export default (router: express.Router) => {
    router.post("/payment/online", createPaymentSession);
    router.post("/payment/cash", createCashPayment);
}