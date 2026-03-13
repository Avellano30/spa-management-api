import express from "express";
import {
  createCashPayment,
  createPaymentSession,
  createPaymongoPaymentSession,
  createPaymongoRefund,
} from "../controller/payment";
import { create } from "domain";

export default (router: express.Router) => {
  router.post("/payment/online", createPaymentSession);
  router.post("/payment/cash", createCashPayment);
  router.post("/payment/paymongo", createPaymongoPaymentSession);
  router.post("/payment/refund/:id", createPaymongoRefund);
};
