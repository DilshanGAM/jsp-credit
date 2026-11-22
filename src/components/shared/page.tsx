"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
	return (
		<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
			</div>
			{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
		</div>
	);
}

export function SectionTabs({ label, tabs }: { label: string; tabs: { href: string; label: string }[] }) {
	const pathname = usePathname();
	return (
		<nav aria-label={label} className="mb-5 flex gap-1 overflow-x-auto border-b">
			{tabs.map((tab) => {
				const current = pathname === tab.href;
				return (
					<Link
						key={tab.href}
						href={tab.href}
						aria-current={current ? "page" : undefined}
						className={cn(
							"whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium focus-visible:-outline-offset-2",
							current ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
	return <section className={cn("overflow-hidden rounded-lg border bg-card", className)}>{children}</section>;
}

export function Toolbar({ children }: { children: ReactNode }) {
	return <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function SearchInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
	return (
		<div className="relative w-full sm:max-w-xs">
			<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
			<Input type="search" aria-label={label} placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} className="pl-9" />
		</div>
	);
}

export function DetailList({ items }: { items: [string, ReactNode][] }) {
	return (
		<dl className="grid grid-cols-2 gap-4 text-sm">
			{items.map(([term, value]) => (
				<div key={term} className="min-w-0">
					<dt className="text-xs text-muted-foreground">{term}</dt>
					<dd className="mt-0.5 break-words font-medium tabular-nums">{value}</dd>
				</div>
			))}
		</dl>
	);
}
