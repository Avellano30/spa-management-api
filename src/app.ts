import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import redoc from "redoc-express";
import router from "./router";
import swaggerSpec from "./docs/swagger";

const app = express();

app.use(cors());
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());

// ROUTES
app.use("/", router());

// API DOCS
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api/redoc", redoc({
  title: "Spa Management System API Docs",
  specUrl: "/api/swagger.json",
}));

app.get("/api/swagger.json", (req, res) => res.json(swaggerSpec));

app.get("/keep-alive", (_, res) => res.send("Server is alive!"));

export default app;
