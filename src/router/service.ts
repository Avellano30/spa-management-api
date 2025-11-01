import express from "express";
import { createService, getAllServices, getServiceById, updateService, deleteService } from "../controller/service";
import { upload } from "../middleware/upload";

export default (router: express.Router) => {
    router.get("/services", getAllServices);
    router.get("/services/:id", getServiceById);
    router.post("/services", upload.single("image"), createService);
    router.patch("/services/:id", upload.single("image"), updateService);
    router.delete("/services/:id", deleteService);
};
