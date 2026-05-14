import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import tasksRouter from "./tasks";
import financialInfoRouter from "./financial-info";
import taxReferencesRouter from "./tax-references";
import taxReturnsRouter from "./tax-returns";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/clients", clientsRouter);
router.use("/tasks", tasksRouter);
router.use("/financial-info", financialInfoRouter);
router.use("/tax-references", taxReferencesRouter);
router.use("/tax-returns", taxReturnsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/admin", adminRouter);
router.use("/ai", aiRouter);

export default router;
