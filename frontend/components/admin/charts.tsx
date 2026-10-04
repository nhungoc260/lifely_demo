"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Legend } from "recharts";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" } as const;
const TIP = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--foreground)" } as const;
const PALETTE = ["#9f1239", "#d97706", "#059669", "#2563eb", "#7c3aed", "#64748b", "#db2777", "#0891b2", "#ca8a04"];

export function RequestsOverTime({ data }: { data: { day: string; total: number; critical: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data.map((d) => ({ ...d, label: d.day.slice(5) }))} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TIP} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="total" name="All requests" stroke="#9f1239" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="critical" name="Critical" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonorGrowth({ data }: { data: { month: string; donors: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9f1239" stopOpacity={0.3} /><stop offset="100%" stopColor="#9f1239" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TIP} />
        <Area type="monotone" dataKey="donors" name="New donors" stroke="#9f1239" strokeWidth={2} fill="url(#dg)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BloodTypeChart({ data }: { data: { bloodType: string; donors: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bloodType" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TIP} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="donors" name="Donors" fill="#9f1239" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusChart({ data }: { data: { status: string; total: number }[] }) {
  const label = (s: string) => s.replaceAll("_", " ").toLowerCase();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data.map((d) => ({ ...d, name: label(d.status) }))} dataKey="total" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="var(--card)">
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={TIP} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ResponseChart({ data }: { data: { urgency: string; avgMinutes: number; responses: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="urgency" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} unit=" m" />
        <Tooltip contentStyle={TIP} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="avgMinutes" name="Avg. response (min)" fill="#d97706" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
