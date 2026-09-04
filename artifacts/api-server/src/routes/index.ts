import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionRouter from "./session";
import authRouter from "./auth";
import entriesRouter from "./entries";
import chatRouter from "./chat";
import readRouter from "./read";
import moveRouter from "./move";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(authRouter);
router.use(entriesRouter);
router.use(chatRouter);
router.use(readRouter);
router.use(moveRouter);
router.use(notificationsRouter);

export default router;



