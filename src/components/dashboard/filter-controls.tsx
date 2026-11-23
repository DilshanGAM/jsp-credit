"use client";

import { useMemo } from "react";
import { CustomerPicker } from "@/components/admin/customer-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { todayLocal } from "@/lib/analytics/definitions";
import { PRESETS, type DashboardFilters, type Preset, type WidgetFilters } from "@/lib/analytics/layout";
import { useResource } from "@/lib/use-resource";
import { resolveRange } from "@/components/dashboard/range";

type Person = { nic: string; name: string };

/** People who have collected or issued anything, so managers also see admins who issued loans. */
export function usePeople() {
	const today = todayLocal();
	const range = `from=2024-01-01&to=${today}`;
	const collectors = useResource<{ data: Person[] }>(`/analytics?metric=collectors&${range}`);
	const issuers = useResource<{ data: Person[] }>(`/analytics?metric=issuers&${range}`);
	const sort = (list?: Person[]) => [...(list ?? [])].sort((a, b) => a.name.localeCompare(b.name));
	return useMemo(() => ({ collectors: sort(collectors.data?.data), issuers: sort(issuers.data?.data) }), [collectors.data, issuers.data]);
}

interface FilterFieldsProps {
	value: WidgetFilters;
	onChange: (value: WidgetFilters) => void;
	/** Label every control (forms) rather than relying on aria-labels (toolbar). */
	labelled?: boolean;
	idPrefix: string;
}

/** Collector, customer, issuer, loan and visit status. Empty means "all". */
export function FilterFields({ value, onChange, labelled, idPrefix }: FilterFieldsProps) {
	const people = usePeople();
	const set = (key: keyof WidgetFilters, v: string) => onChange({ ...value, [key]: v || undefined });
	const wrap = (label: string, id: string, control: React.ReactNode) =>
		labelled ? (
			<div className="space-y-1.5">
				<label htmlFor={id} className="text-sm font-medium">
					{label}
				</label>
				{control}
			</div>
		) : (
			control
		);
	const select = (key: keyof WidgetFilters, label: string, all: string, options: [string, string][]) =>
		wrap(
			label,
			`${idPrefix}-${key}`,
			<NativeSelect id={`${idPrefix}-${key}`} aria-label={labelled ? undefined : label} className={labelled ? undefined : "w-full sm:w-44"} value={value[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
				<option value="">{all}</option>
				{options.map(([v, l]) => (
					<option key={v} value={v}>
						{l}
					</option>
				))}
			</NativeSelect>
		);
	return (
		<>
			{select("collector", "Collector", "All collectors", people.collectors.map((p) => [p.nic, p.name]))}
			{wrap(
				"Customer",
				`${idPrefix}-customer`,
				<div className={labelled ? undefined : "w-full sm:w-56"}>
					<CustomerPicker id={`${idPrefix}-customer`} aria-label={labelled ? undefined : "Customer"} placeholder="All customers" value={value.customer ?? ""} onChange={(nic) => set("customer", nic)} />
				</div>
			)}
			{select("issuer", "Issued by", "Anyone issuing", people.issuers.map((p) => [p.nic, p.name]))}
			{select("loanStatus", "Loan status", "All loan statuses", [["active", "Active"], ["completed", "Completed"]])}
			{select("visitStatus", "Visit status", "All visits", [["ended", "Verified"], ["started", "Not verified"]])}
		</>
	);
}

export function PeriodControls({ value, onChange }: { value: DashboardFilters; onChange: (value: DashboardFilters) => void }) {
	const range = resolveRange(value);
	const invalid = value.preset === "custom" && (!value.from || !value.to || value.from > value.to);
	return (
		<>
			<NativeSelect
				aria-label="Period"
				className="w-full sm:w-44"
				value={value.preset}
				onChange={(e) => {
					const preset = e.target.value as Preset;
					// a custom range starts from whatever was showing
					onChange(preset === "custom" ? { ...value, preset, ...range } : { ...value, preset, from: undefined, to: undefined });
				}}
			>
				{Object.entries(PRESETS).map(([v, l]) => (
					<option key={v} value={v}>
						{l}
					</option>
				))}
			</NativeSelect>
			{value.preset === "custom" && (
				<span className="flex flex-wrap items-center gap-2">
					<Input type="date" aria-label="From date" className="w-40" value={value.from ?? ""} max={value.to || todayLocal()} onChange={(e) => onChange({ ...value, from: e.target.value })} />
					<span className="text-sm text-muted-foreground">to</span>
					<Input type="date" aria-label="To date" className="w-40" value={value.to ?? ""} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
					{invalid && (
						<span role="alert" className="text-sm font-medium text-destructive">
							Choose a start date on or before the end date.
						</span>
					)}
				</span>
			)}
		</>
	);
}

export function ClearFilters({ value, onChange }: { value: DashboardFilters; onChange: (value: DashboardFilters) => void }) {
	const active = (["collector", "customer", "issuer", "loanStatus", "visitStatus"] as const).some((k) => value[k]);
	if (!active) return null;
	return (
		<Button variant="ghost" onClick={() => onChange({ preset: value.preset, from: value.from, to: value.to })}>
			Clear filters
		</Button>
	);
}
