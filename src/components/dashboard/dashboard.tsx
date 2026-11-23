"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactGridLayout, { useContainerWidth, verticalCompactor, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import axios from "axios";
import toast from "react-hot-toast";
import { Copy, LayoutDashboard, MoreHorizontal, Pencil, Plus, RotateCcw, Save, Star, Trash2, X } from "lucide-react";
import { useSession } from "@/components/admin/session-context";
import { WIDGETS } from "@/components/dashboard/catalog";
import { DEFAULT_CONFIG } from "@/components/dashboard/default-layout";
import { AddWidgetDialog, NameDialog, WidgetSettingsDialog } from "@/components/dashboard/dialogs";
import { ClearFilters, FilterFields, PeriodControls } from "@/components/dashboard/filter-controls";
import { resolveRange } from "@/components/dashboard/range";
import { WidgetFrame } from "@/components/dashboard/widget-frame";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/shared/feedback";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { api, errorMessage } from "@/lib/api";
import { GRID_COLUMNS, parseConfig, type DashboardConfig, type DashboardFilters, type Widget, type WidgetType } from "@/lib/analytics/layout";
import { useResource } from "@/lib/use-resource";

interface LayoutSummary {
	id: number;
	name: string;
	isDefault: boolean;
	version: number;
	updatedAt: string;
	updatedByName: string;
}
interface LayoutRecord extends LayoutSummary {
	config: DashboardConfig;
}

const ROW_HEIGHT = 40;
const MARGIN = 16;
const BUILT_IN = 0;
const STORE_KEY = "dashboard.layout";

const remember = (id: number) => {
	try {
		localStorage.setItem(STORE_KEY, String(id));
	} catch {}
};
const recalled = () => {
	try {
		return Number(localStorage.getItem(STORE_KEY)) || null;
	} catch {
		return null;
	}
};

/** Configs saved by an older version may be invalid; fall back rather than break the page. */
const safeConfig = (config: unknown): DashboardConfig => {
	const parsed = parseConfig(config);
	return typeof parsed === "string" ? DEFAULT_CONFIG : parsed;
};

const same = (a: DashboardConfig, b: DashboardConfig) => JSON.stringify(a) === JSON.stringify(b);

export function Dashboard() {
	const { user, isAdmin } = useSession();
	const list = useResource<LayoutSummary[]>("/dashboard-layouts");
	const [selected, setSelected] = useState<number | null>(null);
	const [record, setRecord] = useState<LayoutRecord | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
	const [editing, setEditing] = useState(false);
	const [adding, setAdding] = useState(false);
	const [settingsFor, setSettingsFor] = useState<Widget | null>(null);
	const [naming, setNaming] = useState<null | "save-as" | "rename" | "duplicate">(null);
	const [deleting, setDeleting] = useState(false);
	const [saving, setSaving] = useState(false);
	const { width, containerRef, mounted } = useContainerWidth();

	const saved = record ? safeConfig(record.config) : DEFAULT_CONFIG;
	const dirty = !same(config, saved);
	// Only unsaved widget changes warn before leaving; a changed filter is not worth a prompt.
	const widgetsChanged = JSON.stringify(config.widgets) !== JSON.stringify(saved.widgets);
	// The grid needs room for 12 columns; narrower screens get a stacked, read-only view.
	const wide = mounted && width >= 1000;

	// Which layout to open: the one used last on this device, else the shared default.
	useEffect(() => {
		if (!list.data || selected !== null) return;
		const last = recalled();
		const pick = list.data.find((l) => l.id === last) ?? list.data.find((l) => l.isDefault) ?? list.data[0];
		setSelected(pick?.id ?? BUILT_IN);
	}, [list.data, selected]);

	const open = useCallback(async (id: number) => {
		setLoadError(null);
		setEditing(false);
		if (id === BUILT_IN) {
			setRecord(null);
			setConfig(DEFAULT_CONFIG);
			return;
		}
		try {
			const { data } = await api.get<LayoutRecord>(`/dashboard-layouts?id=${id}`);
			setRecord(data);
			setConfig(safeConfig(data.config));
			remember(id);
		} catch (e) {
			setLoadError(errorMessage(e, "Couldn't open this layout."));
		}
	}, []);

	useEffect(() => {
		if (selected !== null) open(selected);
	}, [selected, open]);

	useEffect(() => {
		if (!widgetsChanged) return;
		const warn = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [widgetsChanged]);

	const range = useMemo(() => resolveRange(config.filters), [config.filters]);
	const rangeValid = range.from <= range.to;
	const setFilters = (filters: DashboardFilters) => setConfig((c) => ({ ...c, filters }));
	const updateWidget = (w: Widget) => setConfig((c) => ({ ...c, widgets: c.widgets.map((x) => (x.id === w.id ? w : x)) }));

	function addWidget(type: WidgetType) {
		const { w, h } = WIDGETS[type].size;
		const bottom = config.widgets.reduce((m, x) => Math.max(m, x.y + x.h), 0);
		let n = 1;
		while (config.widgets.some((x) => x.id === `${type}-${n}`)) n++;
		setConfig((c) => ({ ...c, widgets: [...c.widgets, { id: `${type}-${n}`, type, x: 0, y: bottom, w, h }] }));
		setAdding(false);
		toast.success(`${WIDGETS[type].label} added at the bottom`);
	}

	function onLayoutChange(layout: Layout) {
		if (!editing) return;
		setConfig((c) => {
			const byId = new Map(layout.map((l) => [l.i, l]));
			const widgets = c.widgets.map((w) => {
				const l = byId.get(w.id);
				return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
			});
			return same({ ...c, widgets }, c) ? c : { ...c, widgets };
		});
	}

	async function afterSave(data: LayoutRecord, message: string) {
		setRecord(data);
		setConfig(safeConfig(data.config));
		setSelected(data.id);
		remember(data.id);
		setEditing(false);
		list.reload();
		toast.success(message);
	}

	async function save() {
		if (!record) return setNaming("save-as");
		setSaving(true);
		try {
			const { data } = await api.put<LayoutRecord>("/dashboard-layouts", { id: record.id, version: record.version, config });
			await afterSave(data, "Layout saved");
		} catch (e) {
			if (axios.isAxiosError(e) && e.response?.status === 409) {
				toast.error(errorMessage(e), { duration: 10000 });
			} else toast.error(errorMessage(e, "Couldn't save the layout."));
		} finally {
			setSaving(false);
		}
	}

	async function submitName(name: string) {
		try {
			if (naming === "rename" && record) {
				const { data } = await api.put<LayoutRecord>("/dashboard-layouts", { id: record.id, version: record.version, name });
				setRecord(data);
				list.reload();
				toast.success("Layout renamed");
			} else {
				const { data } = await api.post<LayoutRecord>("/dashboard-layouts", { name, config: naming === "duplicate" ? saved : config });
				await afterSave(data, naming === "duplicate" ? "Copy created" : "Layout saved");
			}
			setNaming(null);
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't save the layout."));
		}
	}

	async function makeDefault() {
		if (!record) return;
		try {
			const { data } = await api.put<LayoutRecord>("/dashboard-layouts", { id: record.id, version: record.version, isDefault: true });
			setRecord(data);
			list.reload();
			toast.success(`"${data.name}" now opens by default`);
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't change the default."));
		}
	}

	async function remove() {
		if (!record) return;
		try {
			await api.delete(`/dashboard-layouts?id=${record.id}`);
			toast.success("Layout deleted");
			setDeleting(false);
			try {
				localStorage.removeItem(STORE_KEY);
			} catch {}
			// open the default (or first) remaining layout, never the deleted one
			const remaining = (list.data ?? []).filter((l) => l.id !== record.id);
			const next = remaining.find((l) => l.isDefault) ?? remaining[0];
			list.reload();
			setSelected(next?.id ?? BUILT_IN);
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't delete the layout."));
		}
	}

	function choose(id: number) {
		if (dirty) {
			toast.error("Save or discard your changes first.");
			return;
		}
		setSelected(id);
	}

	// The measured element must exist from the first render, or the grid never learns its width.
	if (list.error) return <div ref={containerRef}><ErrorState message={list.error} onRetry={list.reload} /></div>;
	if (!list.data || selected === null) return <div ref={containerRef}><LoadingState label="Loading dashboard" /></div>;

	const layouts = list.data;
	const ordered = [...config.widgets].sort((a, b) => a.y - b.y || a.x - b.x);
	const ctx = { ...range, isAdmin };
	const frame = (w: Widget) => (
		<WidgetFrame
			widget={w}
			range={range}
			filters={config.filters}
			ctx={ctx}
			editing={editing}
			onSettings={() => setSettingsFor(w)}
			onRemove={() => setConfig((c) => ({ ...c, widgets: c.widgets.filter((x) => x.id !== w.id) }))}
			onView={(view) => updateWidget({ ...w, options: { ...w.options, view } })}
		/>
	);

	return (
		<div ref={containerRef} className="min-w-0">
			<PageHeader
				title="Dashboard"
				description={`Welcome back, ${user.name}. Figures are in Sri Lanka time.`}
				actions={
					editing ? (
						<>
							<Button variant="outline" onClick={() => setAdding(true)}>
								<Plus aria-hidden />
								Add widget
							</Button>
							<Button variant="outline" onClick={() => { setConfig(saved); setEditing(false); }}>
								<X aria-hidden />
								Cancel
							</Button>
							<Button onClick={save} loading={saving}>
								<Save aria-hidden />
								{record ? "Save layout" : "Save as…"}
							</Button>
						</>
					) : (
						<>
							{dirty && (
								<>
									<Button variant="ghost" onClick={() => setConfig(saved)}>
										<RotateCcw aria-hidden />
										Discard changes
									</Button>
									<Button onClick={save} loading={saving}>
										<Save aria-hidden />
										{record ? "Save layout" : "Save as…"}
									</Button>
								</>
							)}
							{wide && (
								<Button variant={dirty ? "outline" : "default"} onClick={() => setEditing(true)}>
									<LayoutDashboard aria-hidden />
									Customize
								</Button>
							)}
						</>
					)
				}
			/>

			<div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
				<div className="flex items-center gap-1">
					<NativeSelect aria-label="Layout" className="w-full sm:w-56" value={selected} onChange={(e) => choose(Number(e.target.value))}>
						{layouts.length === 0 && <option value={BUILT_IN}>Standard (not saved)</option>}
						{layouts.map((l) => (
							<option key={l.id} value={l.id}>
								{l.name}
								{l.isDefault ? " (default)" : ""}
							</option>
						))}
					</NativeSelect>
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" aria-label="Layout options">
								<MoreHorizontal aria-hidden />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="min-w-52">
							<DropdownMenuItem className="gap-2 py-2" onSelect={() => setNaming("save-as")}>
								<Save aria-hidden />
								Save as new layout…
							</DropdownMenuItem>
							{record && (
								<>
									<DropdownMenuItem className="gap-2 py-2" onSelect={() => setNaming("duplicate")}>
										<Copy aria-hidden />
										Duplicate
									</DropdownMenuItem>
									<DropdownMenuItem className="gap-2 py-2" onSelect={() => setNaming("rename")}>
										<Pencil aria-hidden />
										Rename…
									</DropdownMenuItem>
									{!record.isDefault && (
										<DropdownMenuItem className="gap-2 py-2" onSelect={makeDefault}>
											<Star aria-hidden />
											Open by default for everyone
										</DropdownMenuItem>
									)}
									<DropdownMenuSeparator />
									<DropdownMenuItem className="gap-2 py-2 text-destructive focus:bg-danger focus:text-danger-foreground" onSelect={() => setDeleting(true)}>
										<Trash2 aria-hidden />
										Delete layout
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<span className="hidden h-6 w-px bg-border sm:block" aria-hidden />
				<PeriodControls value={config.filters} onChange={setFilters} />
				<FilterFields idPrefix="dash" value={config.filters} onChange={(f) => setFilters(f as DashboardFilters)} />
				<ClearFilters value={config.filters} onChange={setFilters} />
			</div>

			{record && (
				<p className="-mt-2 mb-4 text-xs text-muted-foreground">
					{dirty ? "Unsaved changes. " : ""}Last saved by {record.updatedByName} on {new Date(record.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.
				</p>
			)}
			{editing && (
				<p className="mb-4 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground" role="status">
					Drag widgets by their handle, resize them from the bottom-right corner, or set sizes in each widget&apos;s settings.
				</p>
			)}

			{loadError ? (
				<ErrorState message={loadError} onRetry={() => open(selected)} />
			) : !rangeValid ? null : ordered.length === 0 ? (
				<div className="rounded-lg border border-dashed p-10 text-center">
					<p className="font-medium">This layout has no widgets.</p>
					{wide && (
						<Button className="mt-4" onClick={() => { setEditing(true); setAdding(true); }}>
							<Plus aria-hidden />
							Add a widget
						</Button>
					)}
				</div>
			) : (
				<div className="dashboard-grid">
					{wide ? (
						<ReactGridLayout
							width={width}
							layout={config.widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: WIDGETS[w.type].size.minW, minH: WIDGETS[w.type].size.minH }))}
							gridConfig={{ cols: GRID_COLUMNS, rowHeight: ROW_HEIGHT, margin: [MARGIN, MARGIN], containerPadding: [0, 0] }}
							dragConfig={{ enabled: editing, handle: ".widget-drag", cancel: ".widget-control" }}
							resizeConfig={{ enabled: editing, handles: ["se"] }}
							compactor={verticalCompactor}
							onLayoutChange={onLayoutChange}
						>
							{config.widgets.map((w) => (
								<div key={w.id}>{frame(w)}</div>
							))}
						</ReactGridLayout>
					) : (
						<div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
							{ordered.map((w) => (
								<div key={w.id} className={w.w >= 6 || WIDGETS[w.type].group !== "Figures" ? "min-w-0 sm:col-span-2" : "min-w-0"} style={{ height: Math.max(w.h, WIDGETS[w.type].group === "Figures" ? 3 : 7) * ROW_HEIGHT + (w.h - 1) * MARGIN }}>
									{frame(w)}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<AddWidgetDialog open={adding} onClose={() => setAdding(false)} onAdd={addWidget} />
			<WidgetSettingsDialog
				widget={settingsFor}
				editing={editing}
				onClose={() => setSettingsFor(null)}
				onSave={(w) => {
					updateWidget(w);
					setSettingsFor(null);
				}}
			/>
			<NameDialog
				open={naming !== null}
				title={naming === "rename" ? "Rename layout" : naming === "duplicate" ? "Duplicate layout" : "Save as a new layout"}
				initial={naming === "rename" ? record?.name ?? "" : naming === "duplicate" ? `Copy of ${record?.name ?? ""}` : ""}
				confirmLabel={naming === "rename" ? "Rename" : "Save"}
				onClose={() => setNaming(null)}
				onSubmit={submitName}
			/>
			<ConfirmDialog
				open={deleting}
				onClose={() => setDeleting(false)}
				onConfirm={remove}
				destructive
				title={`Delete "${record?.name ?? ""}"?`}
				description="It's removed for everyone. Your data isn't affected."
				confirmLabel="Delete layout"
			/>
		</div>
	);
}
