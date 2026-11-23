"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { WIDGETS } from "@/components/dashboard/catalog";
import { FilterFields } from "@/components/dashboard/filter-controls";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { GRID_COLUMNS, WIDGET_TYPES, type Widget, type WidgetType } from "@/lib/analytics/layout";

export function AddWidgetDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (type: WidgetType) => void }) {
	const groups = ["Figures", "Charts", "Tables", "Lists"] as const;
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Add a widget</DialogTitle>
					<DialogDescription>It goes to the bottom of the dashboard. Drag it into place afterwards.</DialogDescription>
				</DialogHeader>
				<div className="space-y-5">
					{groups.map((group) => (
						<section key={group}>
							<h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
							<ul className="grid gap-2 sm:grid-cols-2">
								{WIDGET_TYPES.filter((t) => WIDGETS[t].group === group).map((type) => (
									<li key={type}>
										<button
											type="button"
											onClick={() => onAdd(type)}
											className="flex h-full w-full items-start gap-3 rounded-lg border p-3 text-left hover:border-primary hover:bg-secondary/50"
										>
											<Plus className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
											<span>
												<span className="block text-sm font-medium">{WIDGETS[type].label}</span>
												<span className="block text-xs text-muted-foreground">{WIDGETS[type].description}</span>
											</span>
										</button>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function WidgetSettingsDialog({ widget, editing, onClose, onSave }: { widget: Widget | null; editing: boolean; onClose: () => void; onSave: (w: Widget) => void }) {
	return (
		<Dialog open={!!widget} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Widget settings</DialogTitle>
					<DialogDescription>{widget && WIDGETS[widget.type].description}</DialogDescription>
				</DialogHeader>
				{widget && <SettingsForm widget={widget} editing={editing} onClose={onClose} onSave={onSave} />}
			</DialogContent>
		</Dialog>
	);
}

function SettingsForm({ widget, editing, onClose, onSave }: { widget: Widget; editing: boolean; onClose: () => void; onSave: (w: Widget) => void }) {
	const def = WIDGETS[widget.type];
	const [draft, setDraft] = useState<Widget>(widget);
	const options = draft.options ?? {};
	const setOptions = (next: Widget["options"]) => setDraft({ ...draft, options: next });

	return (
		<form
			className="space-y-5"
			onSubmit={(e) => {
				e.preventDefault();
				onSave({ ...draft, title: draft.title?.trim() || undefined });
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field id="widget-title" label="Title" hint={`Leave empty for "${def.label}"`} className="sm:col-span-2">
					<Input maxLength={80} value={draft.title ?? ""} placeholder={def.label} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
				</Field>
				{def.options?.view && (
					<Field id="widget-view" label="Show as">
						<NativeSelect value={options.view ?? "chart"} onChange={(e) => setOptions({ ...options, view: e.target.value as "chart" | "table" })}>
							<option value="chart">Chart</option>
							<option value="table">Table</option>
						</NativeSelect>
					</Field>
				)}
				{def.options?.granularity && (
					<Field id="widget-granularity" label="Group by">
						<NativeSelect value={options.granularity ?? ""} onChange={(e) => setOptions({ ...options, granularity: (e.target.value || undefined) as any })}>
							<option value="">Automatic, from the period</option>
							<option value="day">Day</option>
							<option value="week">Week (Monday start)</option>
							<option value="month">Month</option>
						</NativeSelect>
					</Field>
				)}
				{def.options?.limit && (
					<Field id="widget-limit" label="Rows">
						<NativeSelect value={options.limit ?? 10} onChange={(e) => setOptions({ ...options, limit: Number(e.target.value) })}>
							{[5, 10, 25, 50, 100].map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</NativeSelect>
					</Field>
				)}
				{/* a keyboard-friendly alternative to dragging the corner */}
				{editing && (
					<>
						<Field id="widget-width" label="Width">
							<NativeSelect value={draft.w} onChange={(e) => {
								const w = Number(e.target.value);
								setDraft({ ...draft, w, x: Math.min(draft.x, GRID_COLUMNS - w) });
							}}>
								{[2, 3, 4, 5, 6, 7, 8, 9, 10, 12].filter((w) => w >= def.size.minW).map((w) => (
									<option key={w} value={w}>
										{w === 12 ? "Full width" : `${w} of 12 columns`}
									</option>
								))}
							</NativeSelect>
						</Field>
						<Field id="widget-height" label="Height">
							<NativeSelect value={draft.h} onChange={(e) => setDraft({ ...draft, h: Number(e.target.value) })}>
								{[2, 3, 4, 5, 6, 8, 9, 10, 12, 15].filter((h) => h >= def.size.minH).map((h) => (
									<option key={h} value={h}>
										{h} rows
									</option>
								))}
							</NativeSelect>
						</Field>
					</>
				)}
			</div>
			<fieldset className="space-y-3 rounded-lg border p-4">
				<legend className="px-1 text-sm font-medium">Filters for this widget</legend>
				<p className="text-xs text-muted-foreground">These replace the dashboard&apos;s filter of the same kind. Leave as &quot;All&quot; to follow the dashboard.</p>
				<div className="grid gap-4 sm:grid-cols-2">
					<FilterFields labelled idPrefix="widget-filter" value={options.filters ?? {}} onChange={(filters) => setOptions({ ...options, filters: Object.values(filters).some(Boolean) ? filters : undefined })} />
				</div>
			</fieldset>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose}>
					Cancel
				</Button>
				<Button type="submit">Apply</Button>
			</DialogFooter>
		</form>
	);
}

export function NameDialog({ open, title, initial, confirmLabel, onClose, onSubmit }: { open: boolean; title: string; initial: string; confirmLabel: string; onClose: () => void; onSubmit: (name: string) => Promise<void> }) {
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>Layouts are shared: every admin and manager can open and change them.</DialogDescription>
				</DialogHeader>
				{open && <NameForm initial={initial} confirmLabel={confirmLabel} onClose={onClose} onSubmit={onSubmit} />}
			</DialogContent>
		</Dialog>
	);
}

function NameForm({ initial, confirmLabel, onClose, onSubmit }: { initial: string; confirmLabel: string; onClose: () => void; onSubmit: (name: string) => Promise<void> }) {
	const [name, setName] = useState(initial);
	const [busy, setBusy] = useState(false);
	const [touched, setTouched] = useState(false);
	const error = touched && !name.trim() ? "Enter a name." : undefined;
	return (
		<form
			className="space-y-5"
			onSubmit={async (e) => {
				e.preventDefault();
				setTouched(true);
				if (!name.trim()) return;
				setBusy(true);
				try {
					await onSubmit(name.trim());
				} finally {
					setBusy(false);
				}
			}}
		>
			<Field id="layout-name" label="Layout name" error={error}>
				<Input autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
			</Field>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose} disabled={busy}>
					Cancel
				</Button>
				<Button type="submit" loading={busy}>
					{confirmLabel}
				</Button>
			</DialogFooter>
		</form>
	);
}
