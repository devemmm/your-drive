import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { validateRequestBody } from "../middlewares/validators";
import {
  createReportValidator,
  listReportsValidator,
  updateReportValidator,
} from "../middlewares/validators/report.request";
import { isAdmin } from "../middlewares/isAdmin";

const reportsRouter = Router();
reportsRouter.post(
  "/",
  createReportValidator,
  validateRequestBody,
  ReportController.createReport,
);

const adminReportsRouter = Router();
adminReportsRouter.get(
  "/",
  isAdmin,
  listReportsValidator,
  validateRequestBody,
  ReportController.listReports,
);
adminReportsRouter.patch(
  "/:id",
  isAdmin,
  updateReportValidator,
  validateRequestBody,
  ReportController.updateReport,
);

export { reportsRouter, adminReportsRouter };
