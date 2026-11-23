import { addDays, todayLocal, type AnalyticsFilters, type Granularity, type MetricName } from "@/lib/analytics/definitions";
import type { DashboardFilters, Preset, WidgetFilters } from "@/lib/analytics/layout";

// The system went live in December 2024, so "All time" starts before any data.
const ALL_TIME_START = "2024-01-01";

/** The date range a preset means today, in Sri Lanka time. */
export function resolveRange(filters: DashboardFilters, today = todayLocal()): { from: string; to: string } {
	const year = today.slice(0, 4);
	const monthStart = `${today.slice(0, 7)}-01`;
	const ranges: Record<Exclude<Preset, "custom">, [string, string]> = {
		today: [today, today],
		yesterday: [addDays(today, -1), addDays(today, -1)],
		"7d": [addDays(today, -6), today],
		"30d": [addDays(today, -29), today],
		"90d": [addDays(today, -89), today],
		month: [monthStart, today],
		lastMonth: [`${addDays(monthStart, -1).slice(0, 7)}-01`, addDays(monthStart, -1)],
		year: [`${year}-01-01`, today],
		all: [ALL_TIME_START, today],
	};
	if (filters.preset === "custom" && filters.from && filters.to) return { from: filters.from, to: filters.to };
	const [from, to] = ranges[filters.preset === "custom" ? "30d" : filters.preset];
	return { from, to };
}

export function analyticsPath(
	metric: MetricName,
	range: { from: string; to: string },
	filters: WidgetFilters,
	options: { granularity?: Granularity; limit?: number } = {}
) {
	const params = new URLSearchParams({ metric, from: range.from, to: range.to });
	for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
	if (options.granularity) params.set("granularity", options.granularity);
	if (options.limit) params.set("limit", String(options.limit));
	return `/analytics?${params}`;
}

export type ResolvedFilters = AnalyticsFilters;
