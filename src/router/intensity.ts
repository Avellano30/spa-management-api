import express from "express";
import {
  createIntensity,
  getAllIntensities,
  getIntensityById,
  updateIntensity,
  deleteIntensity,
} from "../controller/intensity";

export default (router: express.Router) => {
  router.get("/intensities", getAllIntensities);
  router.get("/intensities/:id", getIntensityById);
  router.post("/intensities", createIntensity);
  router.patch("/intensities/:id", updateIntensity);
  router.delete("/intensities/:id", deleteIntensity);
};
