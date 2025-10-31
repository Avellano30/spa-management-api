import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import router from "./router";

const app = express();

app.use(cors());
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());

// ROUTES
app.use("/", router());

app.get("/keep-alive", (_, res) => res.send("Server is alive!"));

export default app;
