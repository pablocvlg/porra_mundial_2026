"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";

export type ProgressEntry = {
  entryId: number;
  participantName: string;
  totalPoints: number;
  cumulativePoints: (number | null)[];
};

export type ProgressData = {
  xLabels: string[];
  qualificationIndex: number;
  allGroupsFinished: boolean;
  entries: ProgressEntry[];
};

const TOP_COLORS = [
  "#F87171",
  "#FB923C",
  "#FBBF24",
  "#34D399",
  "#38BDF8",
  "#818CF8",
  "#E879F9",
  "#F472B6",
  "#A3E635",
  "#67E8F9",
];
const LAST_COLOR = "#9CA3AF";

function buildChartData(xLabels: string[], entries: ProgressEntry[]) {
  return xLabels.map((label, i) => {
    const point: Record<string, string | number | null> = { x: label };
    entries.forEach(e => { point[e.participantName] = e.cumulativePoints[i] ?? null; });
    return point;
  });
}

function selectEntries(entries: ProgressEntry[]): { top: ProgressEntry[]; last: ProgressEntry | null } {
  if (entries.length === 0) return { top: [], last: null };
  const top = entries.slice(0, Math.min(5, entries.length));
  const last = entries.length > 5 ? entries[entries.length - 1] : null;
  return { top, last };
}

type CustomTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{ name: string; value: number; color: string }>;
};

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const isQual = label === "Clasificación";
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl max-w-[200px]">
      <p className="text-gray-400 mb-2 font-semibold">
        {isQual ? "📌 Fin de fase de grupos" : label}
      </p>
      {[...payload].sort((a, b) => b.value - a.value).map(p => (
        <div key={p.name} className="flex justify-between gap-3 py-0.5">
          <span style={{ color: p.color }} className="truncate">{p.name}</span>
          <span className="text-white font-bold tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

type Props = {
  data: ProgressData;
};

export default function GraficaProgreso({ data }: Props) {
  const { top, last } = selectEntries(data.entries);

  const visibleEntries: Array<{ entry: ProgressEntry; color: string; isLast: boolean }> = [
    ...top.map((e, i) => ({ entry: e, color: TOP_COLORS[i % TOP_COLORS.length], isLast: false })),
    ...(last && !top.some(e => e.entryId === last.entryId)
      ? [{ entry: last, color: LAST_COLOR, isLast: true }]
      : []),
  ];

  const chartData = buildChartData(data.xLabels, visibleEntries.map(v => v.entry));
  const qualLabel = data.xLabels[data.qualificationIndex];

  const groupMatchCount = data.qualificationIndex;
  const knockoutMatchCount = data.xLabels.length - data.qualificationIndex - 1;

  return (
    <div className="bg-gray-900/80 backdrop-blur-md rounded-lg shadow-md p-4 border border-gray-800/50">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-bold text-base">Evolución de puntos</h2>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>{groupMatchCount} partidos de grupo</span>
          {data.allGroupsFinished && <span>{knockoutMatchCount} partidos de eliminatoria</span>}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
          <XAxis
            dataKey="x"
            tick={false}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
          />
          <YAxis
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
            axisLine={{ stroke: "#374151" }}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            content={() => (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-3 px-2 text-xs">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {visibleEntries.filter(v => !v.isLast).map(({ entry, color }, i) => (
                    <div key={entry.entryId} className="flex items-center gap-1.5">
                      <span style={{ display: "inline-block", width: 16, height: 2, backgroundColor: color, borderRadius: 1 }} />
                      <span style={{ color }}>{i + 1}. {entry.participantName}</span>
                    </div>
                  ))}
                </div>
                {visibleEntries.filter(v => v.isLast).map(({ entry, color }) => (
                  <div key={entry.entryId} className="flex items-center gap-1.5 ml-auto">
                    <span style={{ display: "inline-block", width: 16, height: 2, backgroundColor: color, borderRadius: 1 }} />
                    <span style={{ color }}>{entry.participantName} (último)</span>
                  </div>
                ))}
              </div>
            )}
          />

          {/* Línea discontinua fin de fase de grupos */}
          <ReferenceLine
            x={qualLabel}
            stroke="#6B7280"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: "Fin grupos",
              position: "insideTopRight",
              fill: "#6B7280",
              fontSize: 10,
            }}
          />

          {visibleEntries.map(({ entry, color, isLast }) => (
            <Line
              key={entry.entryId}
              type="monotone"
              dataKey={entry.participantName}
              stroke={color}
              strokeWidth={isLast ? 1.5 : 2}
              strokeDasharray={undefined}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-500 mt-2 text-center">
        Top 5 participantes{last ? " + último" : ""} · La línea discontinua vertical marca el fin de la fase de grupos
      </p>
    </div>
  );
}
