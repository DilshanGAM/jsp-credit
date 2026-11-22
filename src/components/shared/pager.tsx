"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { formatCount } from "@/lib/format";

export const PAGE_SIZES = [10, 25, 50];

interface PagerProps {
	page: number;
	limit: number;
	total: number;
	onPage: (page: number) => void;
	onLimit: (limit: number) => void;
}

export function Pager({ page, limit, total, onPage, onLimit }: PagerProps) {
	if (total === 0) return null;
	const pages = Math.ceil(total / limit);
	return (
		<nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
			<p className="text-muted-foreground" aria-live="polite">
				{formatCount(Math.min((page - 1) * limit + 1, total))}–{formatCount(Math.min(page * limit, total))} of{" "}
				{formatCount(total)}
			</p>
			<div className="flex flex-wrap items-center gap-2">
				<NativeSelect
					aria-label="Rows per page"
					className="h-9 w-auto"
					value={limit}
					onChange={(e) => onLimit(Number(e.target.value))}
				>
					{PAGE_SIZES.map((size) => (
						<option key={size} value={size}>
							{size} per page
						</option>
					))}
				</NativeSelect>
				<Button variant="outline" size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
					<ChevronLeft aria-hidden />
				</Button>
				{pages > 2 ? (
					<NativeSelect aria-label="Page" className="h-9 w-auto" value={page} onChange={(e) => onPage(Number(e.target.value))}>
						{Array.from({ length: pages }, (_, i) => (
							<option key={i + 1} value={i + 1}>
								Page {i + 1} of {pages}
							</option>
						))}
					</NativeSelect>
				) : (
					<span className="px-2">
						Page {page} of {pages}
					</span>
				)}
				<Button variant="outline" size="sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
					<ChevronRight aria-hidden />
				</Button>
			</div>
		</nav>
	);
}
