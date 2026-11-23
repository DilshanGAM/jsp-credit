import { NextRequest, NextResponse } from "next/server";
import { daysBetween, defaultGranularity, METRICS, type AnalyticsFilters, type Granularity, type MetricName } from "@/lib/analytics/definitions";
import { runMetric } from "@/lib/analytics/metrics";
import { requirePortalUser } from "@/lib/server-auth";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 3660;
const MAX_BUCKETS = 400;

const isDate = (value: string) => DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

// GET /api/analytics?metric=summary&from=2026-11-01&to=2026-11-30[&collector=&customer=&issuer=&loanStatus=&visitStatus=&granularity=&limit=]
export async function GET(req: NextRequest) {
	const user = requirePortalUser(req);
	if (user instanceof NextResponse) return user;

	const q = req.nextUrl.searchParams;
	const bad = (message: string) => NextResponse.json({ message }, { status: 400 });

	const metric = q.get("metric") ?? "";
	if (!Object.hasOwn(METRICS, metric)) return bad(`Unknown metric. Use one of: ${Object.keys(METRICS).join(", ")}.`);

	const from = q.get("from") ?? "";
	const to = q.get("to") ?? "";
	if (!isDate(from) || !isDate(to)) return bad("from and to must be dates in YYYY-MM-DD form.");
	if (from > to) return bad("from must be on or before to.");
	if (daysBetween(from, to) >= MAX_DAYS) return bad("The date range can't be longer than 10 years.");

	const filters: AnalyticsFilters = { from, to };
	for (const key of ["collector", "customer", "issuer"] as const) {
		const value = q.get(key);
		if (value) {
			if (value.length > 64) return bad(`${key} is too long.`);
			filters[key] = value;
		}
	}
	const loanStatus = q.get("loanStatus");
	if (loanStatus) {
		if (loanStatus !== "active" && loanStatus !== "completed") return bad("loanStatus must be active or completed.");
		filters.loanStatus = loanStatus;
	}
	const visitStatus = q.get("visitStatus");
	if (visitStatus) {
		if (visitStatus !== "started" && visitStatus !== "ended") return bad("visitStatus must be started or ended.");
		filters.visitStatus = visitStatus;
	}

	const granularity = (q.get("granularity") || defaultGranularity(from, to)) as Granularity;
	if (!["day", "week", "month"].includes(granularity)) return bad("granularity must be day, week or month.");
	const perBucket = { day: 1, week: 7, month: 28 }[granularity];
	if ((daysBetween(from, to) + 1) / perBucket > MAX_BUCKETS) return bad(`Too many ${granularity}s in this range. Choose a longer period.`);

	const limit = Number(q.get("limit") ?? 10);
	if (!Number.isInteger(limit) || limit < 1 || limit > 500) return bad("limit must be a whole number from 1 to 500.");

	try {
		const data = await runMetric(metric as MetricName, filters, { granularity, limit });
		return NextResponse.json({ metric, filters, granularity, data, generatedAt: new Date().toISOString() });
	} catch (e) {
		console.error("analytics failed", metric, e instanceof Error ? e.message : e);
		return NextResponse.json({ message: "Couldn't calculate this. Please try again." }, { status: 500 });
	}
}
