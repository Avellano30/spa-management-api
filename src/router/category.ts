import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controller/category";

export default (router: express.Router) => {
  router.get("/categories", getAllCategories);
  router.get("/categories/:id", getCategoryById);
  router.post("/categories", createCategory);
  router.patch("/categories/:id", updateCategory);
  router.delete("/categories/:id", deleteCategory);
};
