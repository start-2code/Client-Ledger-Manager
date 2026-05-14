import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import tasksRouter from "./tasks";
import financialInfoRouter from "./financial-info";
import taxReferencesRouter from "./tax-references";
import taxReturnsRouter from "./tax-returns";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/clients", clientsRouter);
router.use("/tasks", tasksRouter);
router.use("/financial-info", financialInfoRouter);
router.use("/tax-references", taxReferencesRouter);
router.use("/tax-returns", taxReturnsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
