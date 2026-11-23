"use client";

import Link from "next/link";
import { BarChart3, Download, GripVertical, Info, MoreHorizontal, Settings2, Table2, Trash2 } from "lucide-react";
import { formatCell, WIDGETS, type RenderContext, type TableData } from "@/components/dashboard/catalog";
import { analyticsPath } from "@/components/dashboard/range";
import { ErrorState, Skeleton } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { defaultGranularity, FILTER_KEYS, METRICS, type FilterKey } from "@/lib/analytics/definitions";
import type { Widget, WidgetFilters } from "@/lib/analytics/layout";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { cn } from "@/lib/utils";

export const FILTER_LABELS: Record<FilterKey, string> = {
	collector: "collector",
	customer: "customer",
	issuer: "issued by",
	loanStatus: "loan status",
	visitStatus: "visit status",
};

function DataGrid({ table, label }: { table: TableData; label: string }) {
	if (!table.rows.length) return <p className="p-4 text-center text-sm text-muted-foreground">No data for these filters.</p>;
	return (
		<div className="min-h-0 flex-1 overflow-auto" tabIndex={0} role="region" aria-label={label}>
			<table className="w-full text-sm">
				<thead className="sticky top-0 bg-card">
					<tr className="border-b">
						{table.columns.map((c) => (
							<th key={c.key} scope="col" className={cn("whitespace-nowrap px-2 py-2 text-xs font-semibold text-muted-foreground", c.kind && c.kind !== "text" && c.kind !== "date" && c.kind !== "datetime" ? "text-right" : "text-left")}>
								{c.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{table.rows.map((row, i) => (
						<tr key={i} className="border-b last:border-0 hover:bg-muted/50">
							{table.columns.map((c) => {
								const text = formatCell(row[c.key], c.kind);
								const numeric = c.kind && c.kind !== "text" && c.kind !== "date" && c.kind !== "datetime";
								return (
									<td key={c.key} className={cn("px-2 py-2", numeric ? "whitespace-nowrap text-right tabular-nums" : "min-w-24")}>
										{c.href ? (
											<Link href={c.href(row)} className="font-medium text-primary hover:underline">
												{text}
											</Link>
										) : (
											text
										)}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function downloadCsv(name: string, table: TableData) {
	const cell = (v: unknown) => {
		const s = v === null || v === undefined ? "" : String(v);
		// leading = + - @ would run as a formula in Excel
		const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
		return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
	};
	const lines = [table.columns.map((c) => cell(c.label)).join(","), ...table.rows.map((r) => table.columns.map((c) => cell(r[c.key])).join(","))];
	const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
	const a = document.createElement("a");
	a.href = url;
	a.download = `${name.replace(/[^\w-]+/g, "-").toLowerCase()}.csv`;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface WidgetFrameProps {
	widget: Widget;
	range: { from: string; to: string };
	filters: WidgetFilters;
	ctx: RenderContext;
	editing: boolean;
	onSettings: () => void;
	onRemove: () => void;
	onView: (view: "chart" | "table") => void;
}

export function WidgetFrame({ widget, range, filters, ctx, editing, onSettings, onRemove, onView }: WidgetFrameProps) {
	const def = WIDGETS[widget.type];
	const o = widget.options ?? {};
	const merged = { ...filters, ...o.filters };
	const granularity = o.granularity ?? defaultGranularity(range.from, range.to);
	const supported = METRICS[def.metric].filters as readonly FilterKey[];
	const applied = Object.fromEntries(Object.entries(merged).filter(([k]) => supported.includes(k as FilterKey)));
	const ignored = FILTER_KEYS.filter((k) => merged[k] && !supported.includes(k));
	const path = analyticsPath(def.metric, range, applied, {
		granularity: def.options?.granularity ? granularity : undefined,
		limit: def.options?.limit ? o.limit ?? 10 : undefined,
	});
	const { data, error, loading, reload } = useResource<{ data: unknown }>(path);
	const title = widget.title || def.label;
	const view = o.view ?? (def.render ? "chart" : "table");
	const result = data?.data;
	const table = result !== undefined && def.table ? def.table(result) : null;
	const rendered = result !== undefined && def.render && view === "chart" ? def.render(result, ctx, granularity) : undefined;
	const showTable = rendered === undefined && table;

	return (
		<section aria-label={title} className={cn("flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-card", editing && "ring-1 ring-primary/30")}>
			<header className="flex items-start gap-1 border-b px-2 py-2">
				{editing && (
					<span className="widget-drag -ml-1 flex size-8 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing" title="Drag to move" aria-hidden>
						<GripVertical className="size-4" />
					</span>
				)}
				<div className="min-w-0 flex-1 py-1">
					<h2 className="truncate text-sm font-semibold">{title}</h2>
					<p className="truncate text-xs text-muted-foreground">
						{def.live ? "Right now" : def.asOf ? `As of ${formatDate(range.to)}` : range.from === range.to ? formatDate(range.from) : `${formatDate(range.from)} – ${formatDate(range.to)}`}
						{o.filters && Object.values(o.filters).some(Boolean) && " · own filters"}
					</p>
				</div>
				{ignored.length > 0 && (
					<span className="mt-1 flex size-7 items-center justify-center text-muted-foreground" title={`Not filtered by ${ignored.map((k) => FILTER_LABELS[k]).join(", ")}`} aria-label={`Not filtered by ${ignored.map((k) => FILTER_LABELS[k]).join(", ")}`} role="img">
						<Info className="size-4" />
					</span>
				)}
				{/* modal={false}: a modal menu that opens a dialog can leave the page unclickable */}
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="widget-control size-8" aria-label={`Options for ${title}`}>
							<MoreHorizontal aria-hidden />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-48">
						{def.options?.view && (
							<DropdownMenuItem className="gap-2 py-2" onSelect={() => onView(view === "chart" ? "table" : "chart")}>
								{view === "chart" ? <Table2 aria-hidden /> : <BarChart3 aria-hidden />}
								{view === "chart" ? "Show as table" : "Show as chart"}
							</DropdownMenuItem>
						)}
						{table && (
							<DropdownMenuItem className="gap-2 py-2" onSelect={() => downloadCsv(title, table)}>
								<Download aria-hidden />
								Download CSV
							</DropdownMenuItem>
						)}
						<DropdownMenuItem className="gap-2 py-2" onSelect={onSettings}>
							<Settings2 aria-hidden />
							Widget settings
						</DropdownMenuItem>
						{editing && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="gap-2 py-2 text-destructive focus:bg-danger focus:text-danger-foreground" onSelect={onRemove}>
									<Trash2 aria-hidden />
									Remove widget
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</header>
			<div aria-busy={loading} className={cn("widget-control flex min-h-0 flex-1 flex-col p-3 transition-opacity", loading && data && "opacity-60")}>
				{error ? (
					<ErrorState message={error} onRetry={reload} />
				) : result === undefined ? (
					<div role="status" className="flex h-full flex-col gap-2">
						<span className="sr-only">Loading {title}</span>
						<Skeleton className="h-6 w-1/2" />
						<Skeleton className="min-h-8 flex-1" />
					</div>
				) : showTable ? (
					<>
						<DataGrid table={table} label={title} />
						{table.note && <p className="pt-2 text-xs text-muted-foreground">{table.note}</p>}
					</>
				) : (
					<div className="min-h-0 flex-1">{rendered}</div>
				)}
			</div>
		</section>
	);
}
