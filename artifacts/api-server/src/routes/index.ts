import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import tasksRouter from "./tasks";
import financialInfoRouter from "./financial-info";
import taxReferencesRouter from "./tax-references";
import taxReturnsRouter from "./tax-returns";
import saReturnsRouter from "./sa-returns";
import ctReturnsRouter from "./ct-returns";
import accountsPeriodsRouter from "./accounts-periods";
import clientFeesRouter from "./client-fees";
import companiesHouseRouter from "./companies-house";
import mtdItsaRouter from "./mtd-itsa";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import aiRouter from "./ai";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/clients", clientsRouter);
router.use("/tasks", tasksRouter);
router.use("/financial-info", financialInfoRouter);
router.use("/tax-references", taxReferencesRouter);
router.use("/tax-returns", taxReturnsRouter);
router.use("/sa-returns", saReturnsRouter);
router.use("/ct-returns", ctReturnsRouter);
router.use("/accounts-periods", accountsPeriodsRouter);
router.use("/client-fees", clientFeesRouter);
router.use("/companies-house", companiesHouseRouter);
router.use("/mtd-itsa", mtdItsaRouter);
router.use("/dashboard", dashboardRouter);
router.use("/admin", adminRouter);
router.use("/admin/import", importRouter);
router.use("/ai", aiRouter);

export default router;
