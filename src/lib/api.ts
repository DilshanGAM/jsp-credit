import axios from "axios";

const TOKEN_KEY = "token";

export const session = {
	get: () => localStorage.getItem(TOKEN_KEY),
	set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
	clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** The browser's API client. Paths are relative to /api. */
export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
	const token = session.get();
	if (token) config.headers.set("Authorization", `Bearer ${token}`);
	return config;
});

/** Several routes answer errors with an empty body, so always pass a useful fallback. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
	if (!axios.isAxiosError(error)) return fallback;
	if (!error.response) return "Can't reach the server. Check your connection and try again.";
	const message = error.response.data?.message;
	// Prisma's messages are multi-line query dumps, which mean nothing to users.
	return typeof message === "string" && message && !message.includes("invocation") ? message : fallback;
}
