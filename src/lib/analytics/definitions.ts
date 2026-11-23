// Shared by the analytics API, the dashboard UI and the layout validator.

export const TIME_ZONE = "Asia/Colombo";

export const FILTER_KEYS = ["collector", "customer", "issuer", "loanStatus", "visitStatus"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export type Granularity = "day" | "week" | "month";

/** Dates are local (Sri Lanka) calendar days, both ends inclusive. */
export interface AnalyticsFilters {
	from: string;
	to: string;
	collector?: string;
	customer?: string;
	issuer?: string;
	loanStatus?: "active" | "completed";
	visitStatus?: "started" | "ended";
}

export const METRICS = {
	summary: {
		label: "Summary figures",
		filters: ["collector", "customer", "issuer", "loanStatus", "visitStatus"],
		note: "Collections use the collector and visit filters; issued loans and the portfolio don't.",
	},
	collectionsSeries: {
		label: "Collections over time",
		filters: ["collector", "customer", "issuer", "loanStatus", "visitStatus"],
		note: "Expected installments ignore the collector and visit filters, as they come from loans.",
	},
	issuanceSeries: { label: "Loans issued over time", filters: ["customer", "issuer", "loanStatus"] },
	collectors: { label: "Collector performance", filters: ["collector", "customer", "issuer", "loanStatus", "visitStatus"] },
	customers: { label: "Customer balances", filters: ["collector", "customer", "issuer", "loanStatus"], note: "The collector filter applies to collections in the period only." },
	loanStatus: { label: "Portfolio by status", filters: ["customer", "issuer", "loanStatus"] },
	arrearsAging: { label: "Arrears aging", filters: ["customer", "issuer"] },
	weekday: { label: "Collections by weekday", filters: ["collector", "customer", "issuer", "loanStatus", "visitStatus"] },
	verification: { label: "Visit verification", filters: ["collector", "visitStatus"] },
	payments: { label: "Payments", filters: ["collector", "customer", "issuer", "loanStatus", "visitStatus"] },
	issuers: { label: "Loans by issuing officer", filters: ["customer", "issuer", "loanStatus"] },
	dataChecks: { label: "Data checks", filters: ["customer", "issuer", "loanStatus"], note: "Not limited to the date range." },
	attention: { label: "Needs attention", filters: [], note: "Current state, not limited by filters." },
} as const satisfies Record<string, { label: string; filters: readonly FilterKey[]; note?: string }>;

export type MetricName = keyof typeof METRICS;

export function defaultGranularity(from: string, to: string): Granularity {
	const days = daysBetween(from, to) + 1;
	return days <= 45 ? "day" : days <= 200 ? "week" : "month";
}

/** Whole days from a to b (YYYY-MM-DD), b - a. */
export function daysBetween(a: string, b: string) {
	return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function addDays(date: string, days: number) {
	return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Today's date in Sri Lanka, as YYYY-MM-DD. */
export function todayLocal(now = new Date()) {
	return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
