import express, { type Express } from "express";
import cors from "cors";
import pinoHttpModule from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const pinoHttp = typeof pinoHttpModule === "function" ? pinoHttpModule : ((pinoHttpModule as any).pinoHttp || (pinoHttpModule as any).default || pinoHttpModule);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
