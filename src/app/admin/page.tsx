"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleCheck, Flag, Plus, Route, type LucideIcon } from "lucide-react";
import { useSession } from "@/components/admin/session-context";
import { LoanTable } from "@/components/admin/loan-table";
import { ErrorState, Skeleton } from "@/components/shared/feedback";
import { PageHeader, Panel } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatCount, formatDate, formatMoney, plural } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { cn } from "@/lib/utils";
import type LoanType from "@/types/loan";
import type { VisitType } from "@/types/visit";

interface Summary {
	totalIssued: number;
	totalCollection: number;
	totalLoanAmount: number;
	totalVisits: number;
	pendingAmount: number;
	totalLoans: number;
}

const PRESETS = {
	today: "Today",
	"7": "Last 7 days",
	"30": "Last 30 days",
	"90": "Last 90 days",
	month: "This month",
	all: "All time",
	custom: "Custom range",
};
type Preset = keyof typeof PRESETS;

const toInputDate = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presetRange(preset: Preset) {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (preset === "month") start.setDate(1);
	else if (preset === "all") start.setTime(new Date(1970, 0, 2).getTime());
	else if (preset !== "today" && preset !== "custom") start.setDate(start.getDate() - Number(preset) + 1);
	return { from: toInputDate(start), to: toInputDate(now) };
}

function Stat({ label, value, note }: { label: string; value?: string; note?: string }) {
	return (
		<div className="bg-card p-5">
			<p className="text-sm text-muted-foreground">{label}</p>
			{value === undefined ? (
				<Skeleton className="mt-2 h-8 w-32" />
			) : (
				<p className="mt-1 break-words text-xl font-semibold tracking-tight 2xl:text-2xl">{value}</p>
			)}
			{note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
		</div>
	);
}

interface TaskProps {
	href: string;
	icon: LucideIcon;
	title: string;
	detail: (count: number) => string;
	resource: { data: unknown[] | null; error: string | null };
}

function Task({ href, icon: Icon, title, detail, resource }: TaskProps) {
	const count = resource.data?.length;
	return (
		<Link href={href} className="flex items-center gap-3 p-4 hover:bg-muted/60 focus-visible:-outline-offset-2">
			<span className={cn("rounded-md p-2.5", count ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground")}>
				{count === 0 ? <CircleCheck className="size-5" aria-hidden /> : <Icon className="size-5" aria-hidden />}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-medium">{title}</span>
				<span className="block text-xs text-muted-foreground">
					{resource.error ? "Couldn't load" : count === undefined ? "Checking" : detail(count)}
				</span>
			</span>
			<ChevronRight className="size-4 text-muted-foreground" aria-hidden />
		</Link>
	);
}

export default function DashboardPage() {
	const { user, isAdmin } = useSession();
	const [preset, setPreset] = useState<Preset>("30");
	const [range, setRange] = useState(() => presetRange("30"));

	const invalid = !range.from || !range.to || range.from > range.to;
	// Full local-day timestamps: the API compares with lte, so a bare date would drop the last day.
	const path = useMemo(() => {
		if (invalid) return null;
		const start = new Date(`${range.from}T00:00:00`).toISOString();
		const end = new Date(`${range.to}T23:59:59.999`).toISOString();
		return `/summary?startDate=${start}&endDate=${end}`;
	}, [range, invalid]);

	const { data, error, loading, reload } = useResource<{ summary: Summary }>(path);
	const activeVisits = useResource<VisitType[]>("/visit/active");
	const readyToClose = useResource<LoanType[]>(isAdmin ? "/loan/pending-complete" : null);
	const recent = useResource<{ loans: LoanType[] }>("/loan?page=1&limit=5");

	const s = data?.summary;
	const allTime = preset === "all";

	return (
		<>
			<PageHeader
				title="Dashboard"
				description={`Welcome back, ${user.name}.`}
				actions={
					<Button asChild>
						<Link href="/admin/loans?new=1">
							<Plus aria-hidden />
							New loan
						</Link>
					</Button>
				}
			/>

			<div className="mb-4 flex flex-wrap items-center gap-2">
				<NativeSelect
					aria-label="Period"
					className="w-44"
					value={preset}
					onChange={(e) => {
						const next = e.target.value as Preset;
						setPreset(next);
						if (next !== "custom") setRange(presetRange(next));
					}}
				>
					{Object.entries(PRESETS).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</NativeSelect>
				{preset === "custom" ? (
					<>
						<Input type="date" aria-label="From date" className="w-40" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} />
						<span className="text-sm text-muted-foreground">to</span>
						<Input type="date" aria-label="To date" className="w-40" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} />
						{invalid && (
							<p role="alert" className="text-sm font-medium text-destructive">
								Choose a start date on or before the end date.
							</p>
						)}
					</>
				) : (
					!allTime && (
						<p className="text-sm text-muted-foreground">
							{range.from === range.to ? formatDate(range.from) : `${formatDate(range.from)} – ${formatDate(range.to)}`}
						</p>
					)
				)}
			</div>

			{error ? (
				<Panel>
					<ErrorState message={error} onRetry={reload} />
				</Panel>
			) : (
				<section aria-label="Summary" aria-busy={loading} className={cn("grid gap-4 xl:grid-cols-3", loading && s && "opacity-60")}>
					<div className="flex flex-col justify-center rounded-lg bg-brand p-6 text-brand-foreground">
						<p className="text-sm">Collected</p>
						<p className="mt-2 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl xl:text-3xl 2xl:text-4xl">{s ? formatMoney(s.totalCollection) : "…"}</p>
						<p className="mt-2 text-sm">{s ? `${plural(s.totalVisits, "collection visit")} started` : "Loading"}</p>
					</div>
					<div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:col-span-2">
						<Stat label="Principal issued" value={s && formatMoney(s.totalIssued)} note="Before interest" />
						<Stat label="Total repayable" value={s && formatMoney(s.totalLoanAmount)} note="Principal and interest on those loans" />
						<Stat
							label={allTime ? "Outstanding" : "Repayable less collected"}
							value={s && formatMoney(s.pendingAmount)}
							note={allTime ? "Still to be collected" : "For this period only, not the total outstanding"}
						/>
						<Stat label="Loans issued" value={s && formatCount(s.totalLoans)} note="In the selected period" />
					</div>
				</section>
			)}

			<div className="mt-6 grid items-start gap-4 xl:grid-cols-3">
				<Panel>
					<h2 className="border-b px-4 py-3 font-semibold">Needs attention</h2>
					<div className="divide-y">
						<Task
							href="/admin/visits/active"
							icon={Route}
							title="Visits to verify"
							resource={activeVisits}
							detail={(n) => (n ? `${plural(n, "visit")} still open` : "All visits verified")}
						/>
						{isAdmin && (
							<Task
								href="/admin/loans/pending-complete"
								icon={Flag}
								title="Loans ready to close"
								resource={readyToClose}
								detail={(n) => (n ? `${plural(n, "loan")} fully paid` : "Nothing to close")}
							/>
						)}
					</div>
				</Panel>

				<Panel className="min-w-0 xl:col-span-2">
					<div className="flex items-center justify-between border-b px-4 py-3">
						<h2 className="font-semibold">Recent loans</h2>
						<Link href="/admin/loans" className="text-sm font-medium text-primary hover:underline">
							View all
						</Link>
					</div>
					<LoanTable compact loans={recent.data?.loans} loading={recent.loading} error={recent.error} onRetry={recent.reload} />
				</Panel>
			</div>
		</>
	);
}
