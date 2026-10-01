"use client";

import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import type { BurndownPoint } from "@/lib/api";

type BurndownChartProps = {
	points: BurndownPoint[];
};

function formatLocalISODate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatDayLabel(value: string): string {
	const [, month, day] = value.split("-");
	return `${day}/${month}`;
}

export function BurndownChart({ points }: BurndownChartProps) {
	const maxValue = Math.max(
		1,
		...points.map((point) => Math.max(point.remaining, point.ideal)),
	);
	const maxPoints = Math.max(5, Math.ceil(maxValue / 5) * 5);
	const firstDate = points[0]?.date;
	const lastDate = points[points.length - 1]?.date;
	const today = formatLocalISODate(new Date());
	const showToday = Boolean(firstDate && lastDate && today >= firstDate && today <= lastDate);

	return (
		<div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
			<div className="h-[300px] w-full px-2 pt-4 sm:px-4">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
						<CartesianGrid stroke="#f5f5f4" vertical={false} />
						<XAxis
							dataKey="date"
							axisLine={false}
							tickLine={false}
							tick={{ fill: "#a8a29e", fontSize: 11 }}
							tickFormatter={formatDayLabel}
							minTickGap={24}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							tick={{ fill: "#a8a29e", fontSize: 11 }}
							domain={[0, maxPoints]}
							width={32}
						/>
						<Tooltip
							labelFormatter={(label) => formatDayLabel(String(label))}
							contentStyle={{
								borderRadius: "0.75rem",
								border: "1px solid #e7e5e4",
								boxShadow: "0 4px 12px rgba(28, 25, 23, 0.08)",
								fontSize: 12,
							}}
						/>
						<Legend
							wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
							iconType="line"
						/>
						<Line
							name="Ideal"
							type="linear"
							dataKey="ideal"
							stroke="#a8a29e"
							strokeDasharray="6 5"
							strokeWidth={2}
							dot={false}
							activeDot={false}
						/>
						<Line
							name="Real"
							type="monotone"
							dataKey="remaining"
							stroke="#4169e1"
							strokeWidth={2.5}
							 dot={{ r: 3, fill: "#4169e1", strokeWidth: 0 }}
							activeDot={{ r: 5, fill: "#4169e1", strokeWidth: 0 }}
						/>
						{showToday ? <ReferenceLine x={today} stroke="#d6d3d1" strokeDasharray="4 4" label={{ value: "Hoje", position: "insideTopRight", fill: "#a8a29e", fontSize: 10 }} /> : null}
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}