import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionRouter from "./session";
import entriesRouter from "./entries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(entriesRouter);

export default router;
