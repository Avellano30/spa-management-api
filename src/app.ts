import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import router from "./router";
import { stripeWebhook } from "./controller/payment";

const app = express();

app.use(cors());
app.use(compression());
app.use(cookieParser());

// Stripe webhook needs the raw body to validate the signature
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(bodyParser.json());

// ROUTES
app.use("/", router());

app.get("/keep-alive", (_, res) => res.send("Server is alive!"));

export default app;
