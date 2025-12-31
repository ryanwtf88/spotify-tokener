import { spotifyHandler } from "../handler/instance";

export async function getAccessToken(): Promise<string> {
	try {
		const token = await spotifyHandler.getAccessToken();
		return token.accessToken;
	} catch (error) {
		throw new Error(`Error fetching Spotify token: ${error}`);
	}
}

export async function getWebApiToken(
	_clientId?: string,
	_clientSecret?: string,
): Promise<string> {
	try {
		const token = await spotifyHandler.getAccessToken();
		return token.accessToken;
	} catch (error) {
		throw new Error(`Error fetching Spotify Web API token: ${error}`);
	}
}
