"use client";

import type { ReactNode } from "react";
import { ErrorState, Skeleton } from "@/components/shared/feedback";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
	header: string;
	cell: (row: T) => ReactNode;
	align?: "right";
}

interface DataTableProps<T> {
	label: string;
	columns: Column<T>[];
	rows: T[] | null | undefined;
	rowKey: (row: T) => string | number;
	/** Row actions: last column on desktop, top-right of the card on mobile. */
	actions?: (row: T) => ReactNode;
	loading?: boolean;
	error?: string | null;
	onRetry?: () => void;
	empty: ReactNode;
	/** For many columns: stay as cards until xl, as the sidebar takes room from lg. */
	wide?: boolean;
}

/** A table on large screens, a list of cards on small ones. The first column is the card title. */
export function DataTable<T>({ label, columns, rows, rowKey, actions, loading, error, onRetry, empty, wide }: DataTableProps<T>) {
	if (error) return <ErrorState message={error} onRetry={onRetry} />;
	if (!rows) {
		return (
			<div role="status" className="space-y-3 p-4">
				<span className="sr-only">Loading {label}</span>
				{Array.from({ length: 5 }, (_, i) => (
					<Skeleton key={i} className="h-12" />
				))}
			</div>
		);
	}
	if (rows.length === 0) return <>{empty}</>;

	const [title, ...details] = columns;
	return (
		<div aria-busy={loading} className={cn("transition-opacity", loading && "opacity-60")}>
			<div className={cn("hidden", wide ? "xl:block" : "lg:block")}>
				<Table aria-label={label}>
					<TableHeader className="bg-muted/60">
						<TableRow className="hover:bg-transparent">
							{columns.map((column) => (
								<TableHead
									key={column.header}
									className={cn("h-11 whitespace-nowrap px-4 text-xs font-semibold", column.align && "text-right")}
								>
									{column.header}
								</TableHead>
							))}
							{actions && (
								<TableHead className="w-14 px-4">
									<span className="sr-only">Actions</span>
								</TableHead>
							)}
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={rowKey(row)}>
								{columns.map((column) => (
									<TableCell
										key={column.header}
										className={cn("px-4 py-3", column.align && "whitespace-nowrap text-right tabular-nums")}
									>
										{column.cell(row)}
									</TableCell>
								))}
								{actions && <TableCell className="px-4 py-2 text-right">{actions(row)}</TableCell>}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<ul aria-label={label} className={cn("divide-y", wide ? "xl:hidden" : "lg:hidden")}>
				{rows.map((row) => (
					<li key={rowKey(row)} className="p-4">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">{title.cell(row)}</div>
							{actions?.(row)}
						</div>
						<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
							{details.map((column) => (
								<div key={column.header} className="min-w-0">
									<dt className="text-xs text-muted-foreground">{column.header}</dt>
									<dd className="mt-0.5 break-words tabular-nums">{column.cell(row)}</dd>
								</div>
							))}
						</dl>
					</li>
				))}
			</ul>
		</div>
	);
}

export function Primary({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
	return (
		<div className="min-w-0">
			<div className="break-words font-medium">{title}</div>
			{subtitle && <p className="break-words text-xs text-muted-foreground">{subtitle}</p>}
		</div>
	);
}
