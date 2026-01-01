import type {
	PlaylistRequestVariables,
	RecommendationRequestVariables,
	SpotifyAPIRequest,
	SpotifyPlaylist,
	SpotifyPlaylistTrackItem,
	SpotifyTrack,
} from "../types/spotify";
import {
	transformPlaylistResponse,
	transformRecommendationsResponse,
} from "../utils/transformers";
import { getAccessToken } from "./token.service";

const SPOTIFY_API_BASE = "https://api-partner.spotify.com/pathfinder/v2/query";
const SPOTIFY_WEB_API_BASE = "https://api.spotify.com/v1";

export async function fetchPlaylist(
	playlistId: string,
	authToken?: string,
	opts?: { limit?: number; offset?: number },
): Promise<SpotifyPlaylist> {
	const token = authToken ?? (await getAccessToken());
	const limit = opts?.limit ?? 150;
	const offset = opts?.offset ?? 0;

	const payload: SpotifyAPIRequest<PlaylistRequestVariables> = {
		variables: {
			uri: `spotify:playlist:${playlistId}`,
			enableWatchFeedEntrypoint: false,
			limit,
			offset,
		},
		operationName: "fetchPlaylist",
		extensions: {
			persistedQuery: {
				version: 1,
				sha256Hash:
					"bb67e0af06e8d6f52b531f97468ee4acd44cd0f82b988e15c2ea47b1148efc77",
			},
		},
	};

	const response = await fetch(SPOTIFY_API_BASE, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		console.error("Fetch Playlist failed:", response.status, response.statusText);
		throw new Error(`Spotify PARTNER API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	// returns a SpotifyPlaylist object (Spotify Web API-like)
	return transformPlaylistResponse(data) as SpotifyPlaylist;
}

export async function fetchRecommendations(
	trackId: string,
	limit: number = 5,
	authToken?: string,
) {
	const token = authToken ?? (await getAccessToken());

	const payload: SpotifyAPIRequest<RecommendationRequestVariables> = {
		variables: {
			uri: `spotify:track:${trackId}`,
			limit,
		},
		operationName: "internalLinkRecommenderTrack",
		extensions: {
			persistedQuery: {
				version: 1,
				sha256Hash:
					"c77098ee9d6ee8ad3eb844938722db60570d040b49f41f5ec6e7be9160a7c86b",
			},
		},
	};

	const response = await fetch(SPOTIFY_API_BASE, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Spotify API error: ${response.statusText}`);
	}

	const data = await response.json();
	return transformRecommendationsResponse(data, trackId);
}

export async function fetchPlaylistFull(
	playlistId: string,
	limit?: number,
) {
	// Initial fetch
	const playlist = (await fetchPlaylist(
		playlistId,
		undefined,
		typeof limit === "number" && limit > 0 ? { limit } : undefined,
	)) as SpotifyPlaylist;

	const tracks = playlist.tracks.items;
	const total = playlist.tracks.total ?? 0;

	// If we have all tracks or reached the limit, return
	if (
		(typeof limit === "number" && tracks.length >= limit) ||
		tracks.length >= total
	) {
		return playlist;
	}

	// Calculate remaining tracks
	const remaining =
		typeof limit === "number" ? Math.min(limit, total) - tracks.length : total - tracks.length;

	if (remaining <= 0) {
		return playlist;
	}

	const token = await getAccessToken();
	const batchSize = 150; // Use max limit for internal API
	const batches = Math.ceil(remaining / batchSize);
	const fetchPromises: Promise<SpotifyPlaylist>[] = [];

	for (let i = 0; i < batches; i++) {
		const offset = tracks.length + i * batchSize;
		const currentLimit = Math.min(batchSize, remaining - i * batchSize);
		
		fetchPromises.push(
			fetchPlaylist(playlistId, token.accessToken, {
				limit: currentLimit,
				offset,
			})
		);
	}

	const responses = await Promise.all(fetchPromises);

	for (const res of responses) {
		if (res.tracks?.items) {
			tracks.push(...res.tracks.items);
		}
	}

	playlist.tracks.items = tracks;
	return playlist;
}

export async function fetchRecommendationsFull(
	trackId: string,
	limit: number = 5,
) {
	const rec = await fetchRecommendations(trackId, limit);
	const ids = rec.tracks.map((t) => t.id).filter(Boolean);

	if (!ids.length) {
		// return the original seeds and empty tracks array
		return { seeds: rec.seeds, tracks: [] };
	}

	const token = await getWebApiToken();

	const aggregatedTracks: SpotifyTrack[] = [];
	const batches: string[][] = [];
	for (let i = 0; i < ids.length; i += 50) {
		batches.push(ids.slice(i, i + 50));
	}

	for (const batch of batches) {
		const url = `${SPOTIFY_WEB_API_BASE}/tracks?ids=${encodeURIComponent(batch.join(","))}`;
		let attempts = 0;
		let success = false;

		while (!success && attempts < 3) {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				if (Array.isArray(data.tracks)) {
					aggregatedTracks.push(...(data.tracks as SpotifyTrack[]));
				}
				success = true;
				// Small delay to avoid rate limits
				await new Promise((resolve) => setTimeout(resolve, 500));
			} else if (response.status === 429) {
				attempts++;
				const retryAfter = response.headers.get("Retry-After");
				const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * attempts;
				console.log(`Rate limited (429), waiting ${waitTime}ms...`);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			} else {
				const text = await response.text();
				throw new Error(
					`Spotify Web API error: ${response.status} ${response.statusText} - ${text}`,
				);
			}
		}

		if (!success) {
			console.warn("Failed to fetch batch after retries");
		}
	}

	return { seeds: rec.seeds, tracks: aggregatedTracks };
}
