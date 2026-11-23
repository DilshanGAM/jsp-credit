"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleCheck, Flag, Route, TriangleAlert } from "lucide-react";
import { Chart, ChartEmpty, type Series } from "@/components/dashboard/charts";
import type { MetricName } from "@/lib/analytics/definitions";
import type { WidgetType } from "@/lib/analytics/layout";
import { formatCount, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TableColumn {
	key: string;
	label: string;
	kind?: "money" | "count" | "percent" | "date" | "datetime" | "text";
	/** Link the cell, e.g. to a customer's loans. */
	href?: (row: any) => string;
}

export interface TableData {
	columns: TableColumn[];
	rows: Record<string, any>[];
	note?: string;
}

export interface RenderContext {
	from: string;
	to: string;
	isAdmin: boolean;
}

export interface WidgetDefinition {
	label: string;
	description: string;
	group: "Figures" | "Charts" | "Tables" | "Lists";
	metric: MetricName;
	size: { w: number; h: number; minW: number; minH: number };
	/** Shown in the header: "as of" figures describe the end of the range. */
	asOf?: boolean;
	/** Current state, ignoring the period. */
	live?: boolean;
	options?: { view?: boolean; granularity?: boolean; limit?: boolean };
	table?: (data: any) => TableData;
	render?: (data: any, ctx: RenderContext, granularity: string) => ReactNode;
}

export function formatCell(value: any, kind: TableColumn["kind"]) {
	if (value === null || value === undefined) return "—";
	switch (kind) {
		case "money": return formatMoney(value);
		case "count": return formatCount(value);
		case "percent": return `${(value * 100).toFixed(1)}%`;
		case "date": return formatDate(value);
		case "datetime": return formatDateTime(value);
		default: return String(value);
	}
}

const bucketLabel = (granularity: string) => (value: string) =>
	granularity === "month"
		? new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
		: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
	if (!before) return <span className="text-muted-foreground">No {label} in previous period</span>;
	const change = (now - before) / Math.abs(before);
	const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
	return (
		<span className="inline-flex items-center gap-1 text-muted-foreground" title={`Previous period: ${formatMoney(before)}`}>
			<Icon className="size-3.5" aria-hidden />
			<span className="font-medium text-foreground">{`${change >= 0 ? "+" : "−"}${Math.abs(change * 100).toFixed(1)}%`}</span>
			vs previous period
		</span>
	);
}

function Figure({ value, lines }: { value: string; lines: ReactNode[] }) {
	return (
		<div className="flex h-full flex-col justify-center">
			<p className="break-words text-2xl font-semibold tracking-tight tabular-nums 2xl:text-3xl">{value}</p>
			<div className="mt-1.5 space-y-0.5 text-xs">
				{lines.map((line, i) => (
					<p key={i} className="text-muted-foreground">
						{line}
					</p>
				))}
			</div>
		</div>
	);
}

const money = (key: string, label: string): Series => ({ key, label, format: formatMoney });

function AttentionItem({ href, icon: Icon, title, detail, flagged }: { href: string; icon: typeof Route; title: string; detail: string; flagged: boolean }) {
	return (
		<Link href={href} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/60">
			<span className={cn("rounded-md p-2", flagged ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground")}>
				{flagged ? <Icon className="size-4" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-medium">{title}</span>
				<span className="block text-xs text-muted-foreground">{detail}</span>
			</span>
			<ChevronRight className="size-4 text-muted-foreground" aria-hidden />
		</Link>
	);
}

const customerLink = (row: any) => `/admin/loans?customer=${encodeURIComponent(row.nic)}`;

export const WIDGETS: Record<WidgetType, WidgetDefinition> = {
	"kpi-collected": {
		label: "Collected",
		description: "Payments taken in the period, compared with the period before.",
		group: "Figures",
		metric: "summary",
		size: { w: 3, h: 3, minW: 2, minH: 3 },
		render: (d) => (
			<Figure
				value={formatMoney(d.collected)}
				lines={[`${formatCount(d.payments)} payments from ${formatCount(d.customersPaying)} customers`, <Delta key="d" now={d.collected} before={d.previousCollected} label="collections" />]}
			/>
		),
	},
	"kpi-issued": {
		label: "Issued",
		description: "Principal lent in the period, with interest and loan count.",
		group: "Figures",
		metric: "summary",
		size: { w: 3, h: 3, minW: 2, minH: 3 },
		render: (d) => (
			<Figure
				value={formatMoney(d.issued.principal)}
				lines={[`${formatCount(d.issued.loans)} loans · ${formatMoney(d.issued.interest)} interest`, <Delta key="d" now={d.issued.principal} before={d.previousIssuedPrincipal} label="loans" />]}
			/>
		),
	},
	"kpi-outstanding": {
		label: "Outstanding",
		description: "Still to be collected on open loans, at the end of the period.",
		group: "Figures",
		metric: "summary",
		asOf: true,
		size: { w: 3, h: 3, minW: 2, minH: 3 },
		render: (d) => (
			<Figure
				value={formatMoney(d.portfolio.outstanding)}
				lines={[`${formatCount(d.portfolio.openLoans)} open loans`, d.portfolio.overpaid ? `${formatMoney(d.portfolio.overpaid)} overpaid` : "No overpayments"]}
			/>
		),
	},
	"kpi-arrears": {
		label: "In arrears",
		description: "Installments due by the end of the period but not yet paid.",
		group: "Figures",
		metric: "summary",
		asOf: true,
		size: { w: 3, h: 3, minW: 2, minH: 3 },
		render: (d) => (
			<Figure value={formatMoney(d.portfolio.arrears)} lines={[`${formatCount(d.portfolio.loansInArrears)} loans behind`, `of ${formatMoney(d.portfolio.expectedToDate)} due so far`]} />
		),
	},
	"kpi-schedule": {
		label: "On schedule",
		description: "Share of installments due so far that has been paid.",
		group: "Figures",
		metric: "summary",
		asOf: true,
		size: { w: 3, h: 3, minW: 2, minH: 3 },
		render: (d) => (
			<Figure
				value={d.portfolio.onScheduleRate === null ? "—" : `${(d.portfolio.onScheduleRate * 100).toFixed(1)}%`}
				lines={[`${formatMoney(d.portfolio.expectedToDate)} due on open loans`, "Overpayments don't raise this"]}
			/>
		),
	},
	"kpi-unverified": {
		label: "Cash to verify",
		description: "Collected in visits nobody has verified yet. Not affected by filters.",
		group: "Figures",
		metric: "attention",
		live: true,
		size: { w: 3, h: 3, minW: 2, minH: 3 },
		render: (d) => <Figure value={formatMoney(d.unverifiedCash)} lines={[`${formatCount(d.openVisits)} open visits`]} />,
	},
	"chart-collections": {
		label: "Collections vs installments due",
		description: "What was collected in each day, week or month, against what fell due.",
		group: "Charts",
		metric: "collectionsSeries",
		size: { w: 8, h: 9, minW: 4, minH: 6 },
		options: { view: true, granularity: true },
		table: (d) => ({
			columns: [{ key: "from", label: "From", kind: "date" }, { key: "to", label: "To", kind: "date" }, { key: "collected", label: "Collected", kind: "money" }, { key: "expected", label: "Due", kind: "money" }, { key: "payments", label: "Payments", kind: "count" }],
			rows: d,
		}),
		render: (d, _ctx, g) =>
			d.length ? (
				<Chart
					data={d}
					xKey="bucket"
					xFormat={bucketLabel(g)}
					label="Collections and installments due over time"
					summary={`${d.length} periods. Total collected ${formatMoney(d.reduce((s: number, r: any) => s + r.collected, 0))}.`}
					series={[money("collected", "Collected"), { ...money("expected", "Installments due"), kind: "line" }]}
				/>
			) : (
				<ChartEmpty>No data for this period.</ChartEmpty>
			),
	},
	"chart-issuance": {
		label: "Loans issued",
		description: "Principal and interest lent in each day, week or month.",
		group: "Charts",
		metric: "issuanceSeries",
		size: { w: 6, h: 8, minW: 4, minH: 6 },
		options: { view: true, granularity: true },
		table: (d) => ({
			columns: [{ key: "from", label: "From", kind: "date" }, { key: "to", label: "To", kind: "date" }, { key: "loans", label: "Loans", kind: "count" }, { key: "principal", label: "Principal", kind: "money" }, { key: "repayable", label: "Repayable", kind: "money" }],
			rows: d,
		}),
		render: (d, _ctx, g) => (
			<Chart
				data={d.map((r: any) => ({ ...r, interest: Math.round((r.repayable - r.principal) * 100) / 100 }))}
				xKey="bucket"
				xFormat={bucketLabel(g)}
				label="Loans issued over time"
				summary={`${d.reduce((s: number, r: any) => s + r.loans, 0)} loans issued.`}
				series={[{ ...money("principal", "Principal"), stack: "a" }, { ...money("interest", "Interest"), stack: "a" }]}
			/>
		),
	},
	"chart-weekday": {
		label: "Collections by weekday",
		description: "Which days of the week bring in the most.",
		group: "Charts",
		metric: "weekday",
		size: { w: 6, h: 8, minW: 3, minH: 6 },
		options: { view: true },
		table: (d) => ({ columns: [{ key: "day", label: "Day" }, { key: "collected", label: "Collected", kind: "money" }, { key: "payments", label: "Payments", kind: "count" }], rows: d }),
		render: (d) => <Chart data={d.map((r: any) => ({ ...r, day: r.day.slice(0, 3) }))} xKey="day" label="Collections by weekday" summary="Collections for each day of the week." series={[money("collected", "Collected")]} />,
	},
	"chart-status": {
		label: "Portfolio by status",
		description: "Outstanding balance by loan position, at the end of the period.",
		group: "Charts",
		metric: "loanStatus",
		asOf: true,
		size: { w: 4, h: 9, minW: 3, minH: 6 },
		options: { view: true },
		table: (d) => ({ columns: [{ key: "category", label: "Status" }, { key: "loans", label: "Loans", kind: "count" }, { key: "balance", label: "Balance", kind: "money" }, { key: "arrears", label: "Arrears", kind: "money" }], rows: d }),
		render: (d) => <Chart horizontal data={d} xKey="category" label="Outstanding balance by status" summary="Outstanding balance for each loan status." series={[money("balance", "Balance")]} />,
	},
	"chart-aging": {
		label: "Arrears aging",
		description: "Overdue amounts by how many days' installments behind they are.",
		group: "Charts",
		metric: "arrearsAging",
		asOf: true,
		size: { w: 6, h: 8, minW: 3, minH: 6 },
		options: { view: true },
		table: (d) => ({ columns: [{ key: "bucket", label: "Days behind" }, { key: "loans", label: "Loans", kind: "count" }, { key: "arrears", label: "Arrears", kind: "money" }, { key: "balance", label: "Balance", kind: "money" }], rows: d }),
		render: (d) => <Chart data={d} xKey="bucket" label="Arrears by days behind" summary="Arrears grouped by days behind." series={[money("arrears", "Arrears")]} />,
	},
	"table-collectors": {
		label: "Collector performance",
		description: "Collections, visits and cash awaiting verification for each collector.",
		group: "Tables",
		metric: "collectors",
		size: { w: 6, h: 8, minW: 4, minH: 5 },
		table: (d) => ({
			columns: [
				{ key: "name", label: "Collector" },
				{ key: "collected", label: "Collected", kind: "money" },
				{ key: "payments", label: "Payments", kind: "count" },
				{ key: "visitsWithPayments", label: "Visits", kind: "count" },
				{ key: "averagePerVisit", label: "Per visit", kind: "money" },
				{ key: "customers", label: "Customers", kind: "count" },
				{ key: "unverified", label: "To verify", kind: "money" },
			],
			rows: d,
		}),
	},
	"table-customers": {
		label: "Customer balances",
		description: "Customers with the largest balances, with arrears and recent collections.",
		group: "Tables",
		metric: "customers",
		asOf: true,
		size: { w: 12, h: 9, minW: 6, minH: 5 },
		options: { limit: true },
		table: (d) => ({
			columns: [
				{ key: "name", label: "Customer", href: customerLink },
				{ key: "openLoans", label: "Open loans", kind: "count" },
				{ key: "repayable", label: "Repayable", kind: "money" },
				{ key: "paid", label: "Paid", kind: "money" },
				{ key: "balance", label: "Balance", kind: "money" },
				{ key: "arrears", label: "Arrears", kind: "money" },
				{ key: "collected", label: "Collected in period", kind: "money" },
			],
			rows: d.rows,
			note: d.totalCustomers > d.rows.length ? `Top ${d.rows.length} of ${formatCount(d.totalCustomers)} customers` : undefined,
		}),
	},
	"table-issuers": {
		label: "Loans by issuing officer",
		description: "Who issued how much in the period.",
		group: "Tables",
		metric: "issuers",
		size: { w: 6, h: 6, minW: 4, minH: 4 },
		table: (d) => ({ columns: [{ key: "name", label: "Issued by" }, { key: "loans", label: "Loans", kind: "count" }, { key: "principal", label: "Principal", kind: "money" }, { key: "repayable", label: "Repayable", kind: "money" }], rows: d }),
	},
	"table-payments": {
		label: "Payments",
		description: "The latest payments matching the filters, with receipt numbers.",
		group: "Tables",
		metric: "payments",
		size: { w: 8, h: 9, minW: 5, minH: 5 },
		options: { limit: true },
		table: (d) => ({
			columns: [
				{ key: "paidAt", label: "Paid", kind: "datetime" },
				{ key: "receipt", label: "Receipt" },
				{ key: "customerName", label: "Customer", href: (r) => `/admin/loans?customer=${encodeURIComponent(r.customer)}` },
				{ key: "loan", label: "Loan" },
				{ key: "collectorName", label: "Collector" },
				{ key: "status", label: "Visit" },
				{ key: "amount", label: "Amount", kind: "money" },
			],
			rows: d.rows.map((r: any) => ({ ...r, status: r.verified ? "Verified" : "Not verified" })),
			note: d.total > d.rows.length ? `Latest ${d.rows.length} of ${formatCount(d.total)} payments` : undefined,
		}),
	},
	"table-verification": {
		label: "Visit verification",
		description: "Cash verified by each manager, and what is still open.",
		group: "Tables",
		metric: "verification",
		size: { w: 6, h: 6, minW: 4, minH: 4 },
		table: (d) => ({
			columns: [{ key: "name", label: "Verified by" }, { key: "visits", label: "Visits", kind: "count" }, { key: "cash", label: "Cash", kind: "money" }],
			rows: [...d.managers, ...(d.open.visits ? [{ name: "Not verified yet", visits: d.open.visits, cash: d.open.cash }] : [])],
		}),
	},
	attention: {
		label: "Needs attention",
		description: "Shortcuts to open visits and fully paid loans. Not affected by filters.",
		group: "Lists",
		metric: "attention",
		live: true,
		size: { w: 4, h: 5, minW: 3, minH: 4 },
		render: (d, ctx) => (
			<div className="space-y-1">
				<AttentionItem href="/admin/visits/active" icon={Route} title="Visits to verify" flagged={d.openVisits > 0} detail={d.openVisits ? `${formatCount(d.openVisits)} open · ${formatMoney(d.unverifiedCash)}` : "All verified"} />
				{ctx.isAdmin && (
					<AttentionItem href="/admin/loans/pending-complete" icon={Flag} title="Loans ready to close" flagged={d.readyToClose > 0} detail={d.readyToClose ? `${formatCount(d.readyToClose)} fully paid` : "Nothing to close"} />
				)}
			</div>
		),
	},
	"data-checks": {
		label: "Data checks",
		description: "Loans whose stored paid amount differs from their payment records.",
		group: "Lists",
		metric: "dataChecks",
		live: true,
		size: { w: 6, h: 6, minW: 4, minH: 4 },
		table: (d) => ({
			columns: [
				{ key: "loan", label: "Loan" },
				{ key: "customerName", label: "Customer", href: (r) => `/admin/loans?customer=${encodeURIComponent(r.customer)}` },
				{ key: "status", label: "Status" },
				{ key: "stored", label: "Stored paid", kind: "money" },
				{ key: "payments", label: "Payments", kind: "money" },
				{ key: "difference", label: "Difference", kind: "money" },
			],
			rows: d.rows,
			note: `${formatCount(d.loansChecked)} loans checked. ${d.rows.length ? "Reports only, nothing is changed." : "All match."}`,
		}),
		render: (d) =>
			d.rows.length ? undefined : (
				<ChartEmpty>
					<span className="flex items-center gap-2">
						<CircleCheck className="size-4 text-success-foreground" aria-hidden />
						All {formatCount(d.loansChecked)} loans match their payments.
					</span>
				</ChartEmpty>
			),
	},
};

export const WARNING_ICON = TriangleAlert;
