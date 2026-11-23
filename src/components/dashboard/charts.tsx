"use client";

import type { ReactNode } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	type TooltipContentProps,
} from "recharts";

// Validated with the dataviz palette checker (light surface): lightness band, chroma floor,
// colour-blind separation and 3:1 contrast all pass. Keep this order; use at most these three.
export const SERIES = ["#0090a0", "#eb6834", "#6250d6"] as const;
const GRID = "hsl(186 16% 87%)";
const TICK = { fill: "hsl(192 14% 35%)", fontSize: 12 };

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
export const axisMoney = (v: number) => (v === 0 ? "0" : compact.format(v));

export interface Series {
	key: string;
	label: string;
	format: (v: number) => string;
	kind?: "bar" | "line";
	stack?: string;
}

function TooltipBox({ active, payload, label, series, labelFormat }: Partial<TooltipContentProps<number, string>> & { series: Series[]; labelFormat?: (l: string) => string }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
			<p className="mb-1 font-medium text-foreground">{labelFormat ? labelFormat(String(label)) : label}</p>
			{series.map((s, i) => {
				const item = payload.find((p) => p.dataKey === s.key);
				if (!item) return null;
				return (
					<p key={s.key} className="flex items-center justify-between gap-4 text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<span className="inline-block size-2.5 rounded-sm" style={{ background: SERIES[i] }} aria-hidden />
							{s.label}
						</span>
						<span className="font-medium tabular-nums text-foreground">{s.format(Number(item.value))}</span>
					</p>
				);
			})}
		</div>
	);
}

interface ChartProps {
	data: Record<string, unknown>[];
	xKey: string;
	series: Series[];
	label: string;
	xFormat?: (v: string) => string;
	/** Bars run left to right, categories down the side. */
	horizontal?: boolean;
	summary: string;
}

/** Bars and lines on one shared money or count axis. Never two y-axes. */
export function Chart({ data, xKey, series, label, xFormat, horizontal, summary }: ChartProps) {
	const many = data.length > 40;
	// recharts types the payload loosely; TooltipBox reads only numbers it plotted
	const content = (props: any) => <TooltipBox {...props} series={series} labelFormat={xFormat} />;
	const bars = series.map((s, i) =>
		s.kind === "line" ? (
			<Line key={s.key} dataKey={s.key} name={s.label} stroke={SERIES[i]} strokeWidth={2} dot={data.length <= 31 ? { r: 3, strokeWidth: 0, fill: SERIES[i] } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
		) : (
			<Bar
				key={s.key}
				dataKey={s.key}
				name={s.label}
				fill={SERIES[i]}
				stackId={s.stack}
				maxBarSize={many ? 12 : 40}
				radius={s.stack && i < series.length - 1 ? 0 : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
				stroke="#fff"
				strokeWidth={s.stack ? 1 : 0}
				isAnimationActive={false}
			/>
		)
	);
	const legend = series.length > 1 ? <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: TICK.fill }} /> : null;
	const tooltip = <Tooltip content={content} cursor={{ fill: "hsl(184 16% 94%)" }} />;
	return (
		<figure className="h-full" aria-label={label}>
			<figcaption className="sr-only">{summary}</figcaption>
			<ResponsiveContainer width="100%" height="100%" minHeight={120}>
				{horizontal ? (
					<BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
						<CartesianGrid horizontal={false} stroke={GRID} />
						<XAxis type="number" tickFormatter={axisMoney} tick={TICK} axisLine={false} tickLine={false} />
						<YAxis type="category" dataKey={xKey} width={96} tick={TICK} axisLine={false} tickLine={false} />
						{tooltip}
						{legend}
						{bars}
					</BarChart>
				) : (
					<ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
						<CartesianGrid vertical={false} stroke={GRID} />
						<XAxis dataKey={xKey} tickFormatter={xFormat} tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={16} />
						<YAxis tickFormatter={axisMoney} tick={TICK} axisLine={false} tickLine={false} width={48} />
						{tooltip}
						{legend}
						{bars}
					</ComposedChart>
				)}
			</ResponsiveContainer>
		</figure>
	);
}

export function ChartEmpty({ children }: { children: ReactNode }) {
	return <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">{children}</div>;
}
