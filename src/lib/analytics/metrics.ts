import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { addDays, daysBetween, type AnalyticsFilters, type Granularity, type MetricName } from "@/lib/analytics/definitions";

// How the numbers are defined. tests/analytics checks every metric against an independent
// calculation from raw rows, so change both together.
//
// - Money is summed as exact decimals (float8 -> numeric per row), then rounded to cents.
// - Dates are Sri Lankan calendar days. Timestamps are stored as UTC without a zone.
// - Collections are payments, dated by when they were taken (verification time isn't stored).
// - "As of" figures use the end of the range: loans issued by then, payments taken by then.
// - Installments fall due daily, every calendar day, the first one the day after issue.
//   With n days, k due installments are expected to total k x installment, except that all
//   n total exactly the repayable amount. Loans with no days are due in full on issue.
// - Loans closed by an admin ("completed") leave the open portfolio. When they were closed
//   isn't stored, so past "as of" figures also exclude loans closed since.

type Sql = Prisma.Sql;
const { sql, join, raw, empty } = Prisma;

const local = (column: string) => raw(`(((${column}) AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Colombo')::date`);
const money = (value: unknown) => (value === null || value === undefined ? 0 : Number(value));
const int = (value: unknown) => Number(value ?? 0);

function where(conditions: (Sql | null)[]) {
	const used = conditions.filter((c): c is Sql => c !== null);
	return used.length ? sql`WHERE ${join(used, " AND ")}` : empty;
}

function loanConditions(f: AnalyticsFilters, alias = "l"): Sql[] {
	const c: Sql[] = [];
	if (f.customer) c.push(sql`${raw(alias)}."customerId" = ${f.customer}`);
	if (f.issuer) c.push(sql`${raw(alias)}."issuedBy" = ${f.issuer}`);
	if (f.loanStatus) c.push(sql`${raw(alias)}.status = ${f.loanStatus}`);
	return c;
}

function visitConditions(f: AnalyticsFilters, alias = "v"): Sql[] {
	const c: Sql[] = [];
	if (f.collector) c.push(sql`${raw(alias)}."collectorId" = ${f.collector}`);
	if (f.visitStatus) c.push(sql`${raw(alias)}.status = ${f.visitStatus}`);
	return c;
}

const inRange = (f: AnalyticsFilters, column: string) => sql`${local(column)} BETWEEN ${f.from}::date AND ${f.to}::date`;

/** Payments matching every filter, including the date range. */
const filteredPayments = (f: AnalyticsFilters) => sql`
	SELECT p.id, p.amount::numeric AS amount, ${local('p."paidDate"')} AS d, p."paidDate" AS at, p."visitId" AS visit,
	       p."loanId" AS loan, v."collectorId" AS collector, v.status AS visit_status, l."customerId" AS customer
	FROM payment p
	JOIN visit v ON v.id = p."visitId"
	JOIN "Loan" l ON l.id = p."loanId"
	${where([...loanConditions(f), ...visitConditions(f), inRange(f, 'p."paidDate"')])}`;

/** Every loan issued by the end date, with its position on that date. */
const portfolio = (f: AnalyticsFilters) => sql`
	WITH base AS (
		SELECT l.id, l."customerId" AS customer, l.status, l.amount::numeric AS principal,
		       l."totalAmount"::numeric AS total, l."installmentAmount"::numeric AS inst, l."durationDays" AS n,
		       ${local('l."issuedDate"')} AS idate,
		       COALESCE((SELECT SUM(p.amount::numeric) FROM payment p
		                 WHERE p."loanId" = l.id AND ${local('p."paidDate"')} <= ${f.to}::date), 0) AS paid
		FROM "Loan" l
		${where([...loanConditions(f), sql`${local('l."issuedDate"')} <= ${f.to}::date`])}
	), due AS (
		SELECT *, LEAST(GREATEST(${f.to}::date - idate, 0), GREATEST(n, 0)) AS k FROM base
	), pos AS (
		SELECT *, total - paid AS balance,
		       CASE WHEN n <= 0 OR k >= n THEN total ELSE k * inst END AS expected
		FROM due
	)
	SELECT *, status = 'completed' AS closed,
	       CASE WHEN status = 'completed' THEN 0 ELSE GREATEST(expected - paid, 0) END AS arrears
	FROM pos`;

/** Buckets covering the range, each clipped to it. */
const buckets = (f: AnalyticsFilters, g: Granularity) => sql`
	SELECT gs::date AS bucket,
	       GREATEST(gs::date, ${f.from}::date) AS bs,
	       LEAST((gs + ${raw(`interval '1 ${g}'`)} - interval '1 day')::date, ${f.to}::date) AS be
	FROM generate_series(date_trunc(${raw(`'${g}'`)}, ${f.from}::timestamp), ${f.to}::timestamp, ${raw(`interval '1 ${g}'`)}) gs`;

async function summary(f: AnalyticsFilters) {
	const days = daysBetween(f.from, f.to) + 1;
	const prev = { ...f, from: addDays(f.from, -days), to: addDays(f.from, -1) };
	const [collections] = await prisma.$queryRaw<any[]>`
		SELECT (SELECT COALESCE(ROUND(SUM(amount), 2), 0) FROM (${filteredPayments(f)}) x) AS collected,
		       (SELECT COUNT(*) FROM (${filteredPayments(f)}) x) AS payments,
		       (SELECT COUNT(DISTINCT customer) FROM (${filteredPayments(f)}) x) AS customers,
		       (SELECT COALESCE(ROUND(SUM(amount), 2), 0) FROM (${filteredPayments(prev)}) x) AS prev_collected`;
	const issuedIn = (r: AnalyticsFilters) => sql`
		SELECT COUNT(*) AS loans, COALESCE(ROUND(SUM(l.amount::numeric), 2), 0) AS principal,
		       COALESCE(ROUND(SUM(l."totalAmount"::numeric), 2), 0) AS repayable
		FROM "Loan" l ${where([...loanConditions(r), inRange(r, 'l."issuedDate"')])}`;
	const [issued] = await prisma.$queryRaw<any[]>(issuedIn(f));
	const [prevIssued] = await prisma.$queryRaw<any[]>(issuedIn(prev));
	const [book] = await prisma.$queryRaw<any[]>`
		SELECT COUNT(*) FILTER (WHERE NOT closed) AS open_loans,
		       COALESCE(ROUND(SUM(GREATEST(balance, 0)) FILTER (WHERE NOT closed), 2), 0) AS outstanding,
		       COALESCE(ROUND(SUM(GREATEST(-balance, 0)), 2), 0) AS overpaid,
		       COALESCE(ROUND(SUM(expected) FILTER (WHERE NOT closed), 2), 0) AS expected,
		       COALESCE(ROUND(SUM(LEAST(paid, expected)) FILTER (WHERE NOT closed), 2), 0) AS paid_on_schedule,
		       COALESCE(ROUND(SUM(arrears), 2), 0) AS arrears,
		       COUNT(*) FILTER (WHERE arrears > 0) AS loans_in_arrears
		FROM (${portfolio(f)}) x`;
	const [visits] = await prisma.$queryRaw<any[]>`
		SELECT COUNT(*) AS visits FROM visit v ${where([...visitConditions(f), inRange(f, 'v."startDateTime"')])}`;
	const expected = money(book.expected);
	return {
		collected: money(collections.collected),
		payments: int(collections.payments),
		customersPaying: int(collections.customers),
		previousCollected: money(collections.prev_collected),
		issued: {
			loans: int(issued.loans),
			principal: money(issued.principal),
			interest: Math.round((money(issued.repayable) - money(issued.principal)) * 100) / 100,
			repayable: money(issued.repayable),
			averagePrincipal: int(issued.loans) ? Math.round((money(issued.principal) / int(issued.loans)) * 100) / 100 : 0,
		},
		previousIssuedPrincipal: money(prevIssued.principal),
		visits: int(visits.visits),
		portfolio: {
			openLoans: int(book.open_loans),
			outstanding: money(book.outstanding),
			overpaid: money(book.overpaid),
			expectedToDate: expected,
			arrears: money(book.arrears),
			loansInArrears: int(book.loans_in_arrears),
			// share of what was due by the end date that had been paid by then
			onScheduleRate: expected ? Math.round((money(book.paid_on_schedule) / expected) * 10000) / 10000 : null,
		},
		previousPeriod: prev,
	};
}

async function collectionsSeries(f: AnalyticsFilters, g: Granularity) {
	const rows = await prisma.$queryRaw<any[]>`
		WITH r AS (${buckets(f, g)}),
		     pay AS (${filteredPayments(f)}),
		     lo AS (
		       SELECT l."totalAmount"::numeric AS total, l."installmentAmount"::numeric AS inst, l."durationDays" AS n,
		              ${local('l."issuedDate"')} AS idate
		       FROM "Loan" l ${where(loanConditions(f))}
		     )
		SELECT to_char(r.bucket, 'YYYY-MM-DD') AS bucket, to_char(r.bs, 'YYYY-MM-DD') AS bs, to_char(r.be, 'YYYY-MM-DD') AS be,
		       (SELECT COALESCE(ROUND(SUM(amount), 2), 0) FROM pay WHERE d BETWEEN r.bs AND r.be) AS collected,
		       (SELECT COUNT(*) FROM pay WHERE d BETWEEN r.bs AND r.be) AS payments,
		       (SELECT COALESCE(ROUND(SUM(
		          CASE WHEN n <= 0 THEN CASE WHEN idate BETWEEN r.bs AND r.be THEN total ELSE 0 END
		          ELSE GREATEST(LEAST(r.be, idate + n) - GREATEST(r.bs, idate + 1) + 1, 0) * inst
		               + CASE WHEN idate + n BETWEEN r.bs AND r.be THEN total - n * inst ELSE 0 END
		          END), 2), 0) FROM lo) AS expected
		FROM r ORDER BY r.bucket`;
	return rows.map((r) => ({ bucket: r.bucket, from: r.bs, to: r.be, collected: money(r.collected), payments: int(r.payments), expected: money(r.expected) }));
}

async function issuanceSeries(f: AnalyticsFilters, g: Granularity) {
	const rows = await prisma.$queryRaw<any[]>`
		WITH r AS (${buckets(f, g)}),
		     lo AS (SELECT l.amount::numeric AS principal, l."totalAmount"::numeric AS total, ${local('l."issuedDate"')} AS d
		            FROM "Loan" l ${where([...loanConditions(f), inRange(f, 'l."issuedDate"')])})
		SELECT to_char(r.bucket, 'YYYY-MM-DD') AS bucket, to_char(r.bs, 'YYYY-MM-DD') AS bs, to_char(r.be, 'YYYY-MM-DD') AS be,
		       (SELECT COUNT(*) FROM lo WHERE d BETWEEN r.bs AND r.be) AS loans,
		       (SELECT COALESCE(ROUND(SUM(principal), 2), 0) FROM lo WHERE d BETWEEN r.bs AND r.be) AS principal,
		       (SELECT COALESCE(ROUND(SUM(total), 2), 0) FROM lo WHERE d BETWEEN r.bs AND r.be) AS repayable
		FROM r ORDER BY r.bucket`;
	return rows.map((r) => ({ bucket: r.bucket, from: r.bs, to: r.be, loans: int(r.loans), principal: money(r.principal), repayable: money(r.repayable) }));
}

async function collectors(f: AnalyticsFilters) {
	const rows = await prisma.$queryRaw<any[]>`
		WITH pay AS (${filteredPayments(f)}),
		     vis AS (SELECT v."collectorId" AS collector, COUNT(*) AS started FROM visit v
		             ${where([...visitConditions(f), inRange(f, 'v."startDateTime"')])} GROUP BY 1),
		     agg AS (SELECT collector, COUNT(*) AS payments, ROUND(SUM(amount), 2) AS collected,
		                    COUNT(DISTINCT visit) AS visits_with_payments, COUNT(DISTINCT customer) AS customers,
		                    ROUND(COALESCE(SUM(amount) FILTER (WHERE visit_status = 'started'), 0), 2) AS unverified
		             FROM pay GROUP BY 1),
		     who AS (SELECT collector FROM agg UNION SELECT collector FROM vis)
		SELECT who.collector AS nic, u.name, COALESCE(agg.payments, 0) AS payments, COALESCE(agg.collected, 0) AS collected,
		       COALESCE(agg.visits_with_payments, 0) AS visits_with_payments, COALESCE(agg.customers, 0) AS customers,
		       COALESCE(agg.unverified, 0) AS unverified, COALESCE(vis.started, 0) AS visits_started
		FROM who LEFT JOIN agg USING (collector) LEFT JOIN vis USING (collector) LEFT JOIN "User" u ON u.nic = who.collector
		ORDER BY collected DESC, u.name, who.collector`;
	return rows.map((r) => ({
		nic: r.nic,
		name: r.name ?? r.nic,
		payments: int(r.payments),
		collected: money(r.collected),
		visitsStarted: int(r.visits_started),
		visitsWithPayments: int(r.visits_with_payments),
		averagePerVisit: int(r.visits_with_payments) ? Math.round((money(r.collected) / int(r.visits_with_payments)) * 100) / 100 : 0,
		customers: int(r.customers),
		unverified: money(r.unverified),
	}));
}

async function customers(f: AnalyticsFilters, limit: number) {
	const rows = await prisma.$queryRaw<any[]>`
		WITH book AS (${portfolio(f)}),
		     per AS (SELECT customer, COUNT(*) FILTER (WHERE NOT closed) AS open_loans, COUNT(*) AS loans,
		                    ROUND(SUM(principal), 2) AS principal, ROUND(SUM(total), 2) AS repayable, ROUND(SUM(paid), 2) AS paid,
		                    ROUND(SUM(GREATEST(balance, 0)) FILTER (WHERE NOT closed), 2) AS balance, ROUND(SUM(arrears), 2) AS arrears
		             FROM book GROUP BY customer),
		     coll AS (SELECT customer, ROUND(SUM(amount), 2) AS collected FROM (${filteredPayments(f)}) x GROUP BY customer)
		SELECT per.customer AS nic, u.name, per.loans, per.open_loans, per.principal, per.repayable, per.paid,
		       COALESCE(per.balance, 0) AS balance, per.arrears, COALESCE(coll.collected, 0) AS collected,
		       COUNT(*) OVER () AS total_rows
		FROM per LEFT JOIN coll USING (customer) LEFT JOIN "User" u ON u.nic = per.customer
		ORDER BY COALESCE(per.balance, 0) DESC, per.arrears DESC, u.name, per.customer
		LIMIT ${limit}`;
	return {
		totalCustomers: rows.length ? int(rows[0].total_rows) : 0,
		rows: rows.map((r) => ({
			nic: r.nic,
			name: r.name ?? r.nic,
			loans: int(r.loans),
			openLoans: int(r.open_loans),
			principal: money(r.principal),
			repayable: money(r.repayable),
			paid: money(r.paid),
			balance: money(r.balance),
			arrears: money(r.arrears),
			collected: money(r.collected),
		})),
	};
}

const STATUS_ORDER = ["Current", "In arrears", "Fully paid", "Closed"];

async function loanStatus(f: AnalyticsFilters) {
	const rows = await prisma.$queryRaw<any[]>`
		SELECT CASE WHEN closed THEN 'Closed' WHEN balance <= 0 THEN 'Fully paid' WHEN arrears > 0 THEN 'In arrears' ELSE 'Current' END AS category,
		       COUNT(*) AS loans, ROUND(SUM(GREATEST(balance, 0)) FILTER (WHERE NOT closed), 2) AS balance,
		       ROUND(SUM(arrears), 2) AS arrears
		FROM (${portfolio(f)}) x GROUP BY 1`;
	const found = new Map(rows.map((r) => [r.category, r]));
	return STATUS_ORDER.map((category) => {
		const r = found.get(category);
		return { category, loans: int(r?.loans), balance: money(r?.balance), arrears: money(r?.arrears) };
	});
}

const AGING = [
	{ label: "1–7 days", min: 1, max: 7 },
	{ label: "8–30 days", min: 8, max: 30 },
	{ label: "31–60 days", min: 31, max: 60 },
	{ label: "61–90 days", min: 61, max: 90 },
	{ label: "Over 90 days", min: 91, max: 1e9 },
];

async function arrearsAging(f: AnalyticsFilters) {
	// Days behind: how many installments the arrears add up to (whole days since issue for loans due at once).
	const rows = await prisma.$queryRaw<any[]>`
		SELECT CASE WHEN n > 0 AND inst > 0 THEN CEIL(arrears / inst) ELSE GREATEST(${f.to}::date - idate, 1) END AS days,
		       arrears, GREATEST(balance, 0) AS balance
		FROM (${portfolio({ ...f, loanStatus: undefined })}) x
		WHERE arrears > 0`;
	return AGING.map(({ label, min, max }) => {
		const inBucket = rows.filter((r) => int(r.days) >= min && int(r.days) <= max);
		const sum = (key: string) => Math.round(inBucket.reduce((s, r) => s + Math.round(Number(r[key]) * 100), 0)) / 100;
		return { bucket: label, loans: inBucket.length, arrears: sum("arrears"), balance: sum("balance") };
	});
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function weekday(f: AnalyticsFilters) {
	const rows = await prisma.$queryRaw<any[]>`
		SELECT EXTRACT(ISODOW FROM d)::int AS dow, ROUND(SUM(amount), 2) AS collected, COUNT(*) AS payments
		FROM (${filteredPayments(f)}) x GROUP BY 1`;
	const found = new Map(rows.map((r) => [int(r.dow), r]));
	return WEEKDAYS.map((day, i) => ({ day, collected: money(found.get(i + 1)?.collected), payments: int(found.get(i + 1)?.payments) }));
}

async function verification(f: AnalyticsFilters) {
	const vw = [...visitConditions(f), inRange(f, 'v."startDateTime"')];
	const rows = await prisma.$queryRaw<any[]>`
		WITH vis AS (
		  SELECT v.id, v.status, v."managerId" AS manager,
		         COALESCE((SELECT SUM(p.amount::numeric) FROM payment p WHERE p."visitId" = v.id), 0) AS cash
		  FROM visit v ${where(vw)}
		)
		SELECT vis.manager AS nic, u.name, vis.status, COUNT(*) AS visits, ROUND(SUM(vis.cash), 2) AS cash
		FROM vis LEFT JOIN "User" u ON u.nic = vis.manager
		GROUP BY vis.manager, u.name, vis.status ORDER BY vis.status, cash DESC, u.name`;
	const open = rows.filter((r) => r.status !== "ended");
	return {
		open: { visits: open.reduce((s, r) => s + int(r.visits), 0), cash: Math.round(open.reduce((s, r) => s + Math.round(Number(r.cash) * 100), 0)) / 100 },
		managers: rows
			.filter((r) => r.status === "ended")
			.map((r) => ({ nic: r.nic, name: r.name ?? r.nic ?? "Unknown", visits: int(r.visits), cash: money(r.cash) })),
	};
}

async function payments(f: AnalyticsFilters, limit: number) {
	const rows = await prisma.$queryRaw<any[]>`
		SELECT x.id, x.at, x.loan, x.visit, x.visit_status, x.amount, x.customer, cu.name AS customer_name,
		       x.collector, co.name AS collector_name, COUNT(*) OVER () AS total_rows
		FROM (${filteredPayments(f)}) x
		LEFT JOIN "User" cu ON cu.nic = x.customer
		LEFT JOIN "User" co ON co.nic = x.collector
		ORDER BY x.at DESC, x.id DESC
		LIMIT ${limit}`;
	return {
		total: rows.length ? int(rows[0].total_rows) : 0,
		rows: rows.map((r) => ({
			receipt: int(r.id),
			paidAt: new Date(r.at).toISOString(),
			loan: int(r.loan),
			visit: int(r.visit),
			verified: r.visit_status === "ended",
			amount: money(r.amount),
			customer: r.customer,
			customerName: r.customer_name ?? r.customer,
			collector: r.collector,
			collectorName: r.collector_name ?? r.collector,
		})),
	};
}

async function issuers(f: AnalyticsFilters) {
	const rows = await prisma.$queryRaw<any[]>`
		SELECT l."issuedBy" AS nic, u.name, COUNT(*) AS loans, ROUND(SUM(l.amount::numeric), 2) AS principal,
		       ROUND(SUM(l."totalAmount"::numeric), 2) AS repayable
		FROM "Loan" l LEFT JOIN "User" u ON u.nic = l."issuedBy"
		${where([...loanConditions(f), inRange(f, 'l."issuedDate"')])}
		GROUP BY 1, 2 ORDER BY principal DESC, u.name`;
	return rows.map((r) => ({ nic: r.nic, name: r.name ?? r.nic, loans: int(r.loans), principal: money(r.principal), repayable: money(r.repayable) }));
}

async function dataChecks(f: AnalyticsFilters) {
	const rows = await prisma.$queryRaw<any[]>`
		SELECT l.id, l."customerId" AS customer, u.name, l.status,
		       ROUND(l."paidAmount"::numeric, 2) AS stored,
		       ROUND(COALESCE((SELECT SUM(p.amount::numeric) FROM payment p WHERE p."loanId" = l.id), 0), 2) AS payments
		FROM "Loan" l LEFT JOIN "User" u ON u.nic = l."customerId"
		${where(loanConditions(f))}`;
	const mismatched = rows.filter((r) => money(r.stored) !== money(r.payments));
	return {
		loansChecked: rows.length,
		rows: mismatched
			.map((r) => ({
				loan: int(r.id),
				customer: r.customer,
				customerName: r.name ?? r.customer,
				status: r.status,
				stored: money(r.stored),
				payments: money(r.payments),
				difference: Math.round((money(r.stored) - money(r.payments)) * 100) / 100,
			}))
			.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference) || a.loan - b.loan),
	};
}

async function attention() {
	const [r] = await prisma.$queryRaw<any[]>`
		SELECT (SELECT COUNT(*) FROM visit WHERE status = 'started') AS open_visits,
		       (SELECT COALESCE(ROUND(SUM(p.amount::numeric), 2), 0) FROM payment p JOIN visit v ON v.id = p."visitId" WHERE v.status = 'started') AS open_cash,
		       (SELECT COUNT(*) FROM "Loan" WHERE status = 'active' AND "paidAmount" >= "totalAmount") AS ready_to_close`;
	return { openVisits: int(r.open_visits), unverifiedCash: money(r.open_cash), readyToClose: int(r.ready_to_close) };
}

export async function runMetric(metric: MetricName, f: AnalyticsFilters, options: { granularity: Granularity; limit: number }) {
	switch (metric) {
		case "summary": return summary(f);
		case "collectionsSeries": return collectionsSeries(f, options.granularity);
		case "issuanceSeries": return issuanceSeries(f, options.granularity);
		case "collectors": return collectors(f);
		case "customers": return customers(f, options.limit);
		case "loanStatus": return loanStatus(f);
		case "arrearsAging": return arrearsAging(f);
		case "weekday": return weekday(f);
		case "verification": return verification(f);
		case "payments": return payments(f, options.limit);
		case "issuers": return issuers(f);
		case "dataChecks": return dataChecks(f);
		case "attention": return attention();
	}
}
