import "dotenv/config";

export const config = {
	// server host/port for local hosting (defaults to 0.0.0.0:3000)
	port: Number(process.env.PORT || 3000),
	host: process.env.HOST || "0.0.0.0",
	browserPath: process.env.BROWSER_PATH,
};
