"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, session } from "@/lib/api";

// Components that mount together (table, filter, form) share one request for the same data.
const inFlight = new Map<string, Promise<any>>();

function load<T>(path: string, fresh: boolean): Promise<T> {
	const key = `${session.get()} ${path}`;
	const pending = inFlight.get(key);
	if (pending && !fresh) return pending;
	const request = api
		.get<T>(path)
		.then((response) => response.data)
		.finally(() => {
			if (inFlight.get(key) === request) inFlight.delete(key);
		});
	inFlight.set(key, request);
	return request;
}

/**
 * GETs an API path and refetches when it changes. Out-of-order responses are ignored, and
 * the previous data stays visible while refetching. Pass null to skip the request.
 */
export function useResource<T>(path: string | null) {
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(path !== null);
	const [version, setVersion] = useState(0);

	useEffect(() => {
		if (path === null) {
			setData(null);
			setError(null);
			setLoading(false);
			return;
		}
		let stale = false;
		setLoading(true);
		setError(null);
		load<T>(path, version > 0)
			.then((result) => {
				if (!stale) setData(result);
			})
			.catch((e) => {
				if (stale) return;
				setData(null);
				setError(errorMessage(e, "Couldn't load this. Please try again."));
			})
			.finally(() => {
				if (!stale) setLoading(false);
			});
		return () => {
			stale = true;
		};
	}, [path, version]);

	const reload = useCallback(() => setVersion((v) => v + 1), []);
	return { data, error, loading, reload };
}
