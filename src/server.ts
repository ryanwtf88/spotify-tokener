import "dotenv/config";

import { Hono, type Context } from "hono";
import { spotifyHandler } from "./handler/instance";
import { logs } from "./utils/logger";
import { serve } from "@hono/node-server";
import spotifyRoutes from "./routes/spotify.routes";
import { config } from "./config/env";

const app = new Hono();

app.get("/api/token", spotifyHandler.honoHandler);
app.get("/clienttoken", spotifyHandler.clientTokenHonoHandler);

app.route("/", spotifyRoutes);

app.onError((err: unknown, c: Context) => {
	logs("error", err);
	return c.json({ error: "Internal Server Error" }, 500);
});

// Cleanup function
async function cleanup() {
	logs("info", "Shutting down server...");
	await spotifyHandler.cleanup();
	process.exit(0);
}

// Handle graceful shutdown
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// @ts-ignore
if (typeof Bun !== "undefined") {
	// @ts-ignore
	Bun.serve({
		fetch: app.fetch,
		port: config.port,
		hostname: "0.0.0.0",
	});
	logs(
		"info",
		`Spotify Token API (Bun) listening on http://0.0.0.0:${config.port}`,
	);
} else if (require.main === module) {
	serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" });
	logs(
		"info",
		`Spotify Token API (Node) listening on http://0.0.0.0:${config.port}`,
	);
}
