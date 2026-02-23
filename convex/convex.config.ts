import { defineApp } from "convex/server";
import selfHosting from "@convex-dev/self-hosting/convex.config";

const app = defineApp();
app.use(selfHosting);

export default app;
