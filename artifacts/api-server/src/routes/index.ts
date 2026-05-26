import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import servicesRouter from "./services";
import credentialsRouter from "./credentials";
import deploymentsRouter from "./deployments";
import metricsRouter from "./metrics";
import productsRouter from "./products";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/services", servicesRouter);
router.use("/credentials", credentialsRouter);
router.use("/deployments", deploymentsRouter);
router.use("/metrics", metricsRouter);
router.use("/products", productsRouter);

export default router;
