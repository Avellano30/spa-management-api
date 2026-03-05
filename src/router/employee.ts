import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controller/employee";
import { upload } from "../middleware/upload";

export default (router: express.Router) => {
  router.get("/employees", getAllEmployees);
  router.get("/employees/:id", getEmployeeById);
  router.post("/employees", upload.single("image"), createEmployee);
  router.patch("/employees/:id", upload.single("image"), updateEmployee);
  router.delete("/employees/:id", deleteEmployee);
};
