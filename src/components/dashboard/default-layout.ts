import type { DashboardConfig } from "@/lib/analytics/layout";

/** Shown until someone saves a layout, and used to start new ones. Tables fit without scrolling at 1280px and up. */
export const DEFAULT_CONFIG: DashboardConfig = {
	version: 1,
	filters: { preset: "30d" },
	widgets: [
		{ id: "collected", type: "kpi-collected", x: 0, y: 0, w: 3, h: 3 },
		{ id: "issued", type: "kpi-issued", x: 3, y: 0, w: 3, h: 3 },
		{ id: "outstanding", type: "kpi-outstanding", x: 6, y: 0, w: 3, h: 3 },
		{ id: "arrears", type: "kpi-arrears", x: 9, y: 0, w: 3, h: 3 },
		{ id: "collections", type: "chart-collections", x: 0, y: 3, w: 8, h: 9 },
		{ id: "attention", type: "attention", x: 8, y: 3, w: 4, h: 4 },
		{ id: "schedule", type: "kpi-schedule", x: 8, y: 7, w: 4, h: 3 },
		{ id: "unverified", type: "kpi-unverified", x: 8, y: 10, w: 4, h: 3 },
		{ id: "collectors", type: "table-collectors", x: 0, y: 13, w: 12, h: 7 },
		{ id: "customers", type: "table-customers", x: 0, y: 20, w: 12, h: 9, options: { limit: 10 } },
		{ id: "status", type: "chart-status", x: 0, y: 29, w: 4, h: 8 },
		{ id: "aging", type: "chart-aging", x: 4, y: 29, w: 4, h: 8 },
		{ id: "issuance", type: "chart-issuance", x: 8, y: 29, w: 4, h: 8 },
		{ id: "payments", type: "table-payments", x: 0, y: 37, w: 8, h: 9, options: { limit: 25 } },
		{ id: "weekday", type: "chart-weekday", x: 8, y: 37, w: 4, h: 9 },
	],
};
