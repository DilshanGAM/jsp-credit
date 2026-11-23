// The saved dashboard format, validated identically by the API and the editor.
import { FILTER_KEYS, type FilterKey, type Granularity } from "@/lib/analytics/definitions";

export const GRID_COLUMNS = 12;

export const WIDGET_TYPES = [
	"kpi-collected",
	"kpi-issued",
	"kpi-outstanding",
	"kpi-arrears",
	"kpi-schedule",
	"kpi-unverified",
	"chart-collections",
	"chart-issuance",
	"chart-weekday",
	"chart-status",
	"chart-aging",
	"table-collectors",
	"table-customers",
	"table-issuers",
	"table-payments",
	"table-verification",
	"attention",
	"data-checks",
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const PRESETS = {
	today: "Today",
	yesterday: "Yesterday",
	"7d": "Last 7 days",
	"30d": "Last 30 days",
	"90d": "Last 90 days",
	month: "This month",
	lastMonth: "Last month",
	year: "This year",
	all: "All time",
	custom: "Custom range",
} as const;
export type Preset = keyof typeof PRESETS;

export type WidgetFilters = Partial<Record<FilterKey, string>>;

export interface WidgetOptions {
	view?: "chart" | "table";
	granularity?: Granularity;
	limit?: number;
	/** Applied on top of the dashboard's filters. */
	filters?: WidgetFilters;
}

export interface Widget {
	id: string;
	type: WidgetType;
	x: number;
	y: number;
	w: number;
	h: number;
	title?: string;
	options?: WidgetOptions;
}

export interface DashboardFilters extends WidgetFilters {
	preset: Preset;
	from?: string;
	to?: string;
}

export interface DashboardConfig {
	version: 1;
	filters: DashboardFilters;
	widgets: Widget[];
}

const MAX_WIDGETS = 40;
const MAX_JSON = 30_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function parseFilters(input: unknown, where: string): WidgetFilters | string {
	if (input === undefined) return {};
	if (!isObject(input)) return `${where} must be an object.`;
	const out: WidgetFilters = {};
	for (const [key, value] of Object.entries(input)) {
		if (key === "preset" || key === "from" || key === "to") continue;
		if (!(FILTER_KEYS as readonly string[]).includes(key)) return `${where} has an unknown filter "${key}".`;
		if (value === undefined || value === "") continue;
		if (typeof value !== "string" || value.length > 64) return `${where}.${key} must be a short text value.`;
		if (key === "loanStatus" && value !== "active" && value !== "completed") return `${where}.loanStatus must be active or completed.`;
		if (key === "visitStatus" && value !== "started" && value !== "ended") return `${where}.visitStatus must be started or ended.`;
		out[key as FilterKey] = value;
	}
	return out;
}

/** Returns a clean copy with only known fields, or an error message. */
export function parseConfig(input: unknown): DashboardConfig | string {
	if (!isObject(input)) return "config must be an object.";
	if (JSON.stringify(input).length > MAX_JSON) return "This layout is too large.";
	if (input.version !== 1) return "config.version must be 1.";

	const rawFilters = input.filters;
	if (!isObject(rawFilters)) return "config.filters must be an object.";
	const preset = rawFilters.preset;
	if (typeof preset !== "string" || !Object.hasOwn(PRESETS, preset)) return "config.filters.preset is not a known period.";
	const filters = parseFilters(rawFilters, "config.filters");
	if (typeof filters === "string") return filters;
	const dashboardFilters: DashboardFilters = { preset: preset as Preset, ...filters };
	if (preset === "custom") {
		const { from, to } = rawFilters;
		if (typeof from !== "string" || typeof to !== "string" || !DATE.test(from) || !DATE.test(to) || from > to) {
			return "A custom period needs from and to dates, in order.";
		}
		dashboardFilters.from = from;
		dashboardFilters.to = to;
	}

	if (!Array.isArray(input.widgets)) return "config.widgets must be a list.";
	if (input.widgets.length > MAX_WIDGETS) return `A layout can have at most ${MAX_WIDGETS} widgets.`;
	const ids = new Set<string>();
	const widgets: Widget[] = [];
	for (const [i, raw] of input.widgets.entries()) {
		const at = `config.widgets[${i}]`;
		if (!isObject(raw)) return `${at} must be an object.`;
		const { id, type, x, y, w, h, title, options } = raw;
		if (typeof id !== "string" || !ID.test(id) || ids.has(id)) return `${at}.id must be unique letters, digits, - or _.`;
		ids.add(id);
		if (typeof type !== "string" || !(WIDGET_TYPES as readonly string[]).includes(type)) return `${at}.type is not a known widget.`;
		if (!isInt(w, 1, GRID_COLUMNS) || !isInt(x, 0, GRID_COLUMNS - 1) || x + w > GRID_COLUMNS) return `${at} must fit within ${GRID_COLUMNS} columns.`;
		if (!isInt(y, 0, 2000) || !isInt(h, 2, 40)) return `${at} has an invalid row or height.`;
		const widget: Widget = { id, type: type as WidgetType, x, y, w, h };
		if (title !== undefined && title !== "") {
			if (typeof title !== "string" || title.length > 80) return `${at}.title must be at most 80 characters.`;
			widget.title = title;
		}
		if (options !== undefined) {
			if (!isObject(options)) return `${at}.options must be an object.`;
			const o: WidgetOptions = {};
			if (options.view !== undefined) {
				if (options.view !== "chart" && options.view !== "table") return `${at}.options.view must be chart or table.`;
				o.view = options.view;
			}
			if (options.granularity !== undefined) {
				if (!["day", "week", "month"].includes(options.granularity as string)) return `${at}.options.granularity must be day, week or month.`;
				o.granularity = options.granularity as Granularity;
			}
			if (options.limit !== undefined) {
				if (!isInt(options.limit, 1, 100)) return `${at}.options.limit must be from 1 to 100.`;
				o.limit = options.limit;
			}
			const f = parseFilters(options.filters, `${at}.options.filters`);
			if (typeof f === "string") return f;
			if (Object.keys(f).length) o.filters = f;
			if (Object.keys(o).length) widget.options = o;
		}
		widgets.push(widget);
	}
	return { version: 1, filters: dashboardFilters, widgets };
}

export function parseName(input: unknown): string | null {
	if (typeof input !== "string") return null;
	const name = input.trim().replace(/\s+/g, " ");
	return name.length >= 1 && name.length <= 60 ? name : null;
}
