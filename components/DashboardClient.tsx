
"use client";

import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { pickPrabhupadaQuote } from "@/lib/quotes";

type Role = "devotee" | "leader" | "superadmin";

type DashboardRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  leaderName?: string | null;
  sectorName?: string | null;
  date: string;
  mangalaArati: boolean;
  tulasiPuja: boolean;
  chantBefore630: number;
  chant630to8: number;
  chant8to10: number;
  chant10to9: number;
  chantAfter9: number;
  readingName: string;
  readingMinutes: number;
  totalScore: number;
  ekadashiObserved?: boolean;
  festivalNote?: string;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
  sectorName?: string | null;
  role?: Role;
};

function scoreMinutes(minutes: number) {
  if (minutes >= 60) return 20;
  if (minutes >= 45) return 15;
  if (minutes >= 30) return 10;
  if (minutes >= 15) return 5;
  return 0;
}

function calcTotal(row: DashboardRow) {
  const a = (row.mangalaArati ? 4 : 0) + (row.tulasiPuja ? 4 : 0);
  const b =
    row.chantBefore630 * 5 +
    row.chant630to8 * 4 +
    row.chant8to10 * 2 +
    row.chant10to9 -
    row.chantAfter9;
  const c = scoreMinutes(row.readingMinutes);
  return a + b + c;
}

function makeBlankRow(userId: string, userName: string, userEmail: string, date: string): DashboardRow {
  return {
    id: `draft-${userId}-${date}`,
    userId,
    userName,
    userEmail,
    leaderName: null,
    date,
    mangalaArati: false,
    tulasiPuja: false,
    chantBefore630: 0,
    chant630to8: 0,
    chant8to10: 0,
    chant10to9: 0,
    chantAfter9: 0,
    readingName: "",
    readingMinutes: 0,
    totalScore: 0,
  };
}

function monthLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function dateLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dayOnly(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
  });
}

function weekdayShort(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
  });
}

function roundsTotal(row: DashboardRow | null) {
  if (!row) return 0;
  return row.chantBefore630 + row.chant630to8 + row.chant8to10 + row.chant10to9 + row.chantAfter9;
}

function scoreA(row: DashboardRow | null) {
  if (!row) return 0;
  return (row.mangalaArati ? 4 : 0) + (row.tulasiPuja ? 4 : 0);
}

function scoreB(row: DashboardRow | null) {
  if (!row) return 0;
  return row.chantBefore630 * 5 + row.chant630to8 * 4 + row.chant8to10 * 2 + row.chant10to9 - row.chantAfter9;
}

function scoreC(row: DashboardRow | null) {
  if (!row) return 0;
  return scoreMinutes(row.readingMinutes);
}

function getSundayRange(endDate: string) {
  const end = new Date(`${endDate}T00:00:00`);
  const day = end.getUTCDay();
  const sunday = new Date(end);
  sunday.setUTCDate(end.getUTCDate() - day);
  const saturday = new Date(sunday);
  saturday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    start: sunday.toISOString().slice(0, 10),
    end: saturday.toISOString().slice(0, 10),
  };
}

function daysOfMonth(startDate: string) {
  const [year, month] = startDate.slice(0, 7).split("-").map(Number);
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, i + 1));
    return d.toISOString().slice(0, 10);
  });
}

function SectorRow({ user }: { user: UserOption }) {
  const [sectorName, setSectorName] = useState(user.sectorName || "");
  const [saving, setSaving] = useState(false);

  async function saveSector() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, sectorName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Could not save sector" }));
        alert(data.error || "Could not save sector");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dayCard">
      <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ minWidth: 180, flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{user.name}</div>
          <div className="muted">{user.email}</div>
        </div>
        <div style={{ minWidth: 200, flex: 1 }}>
          <div className="small muted">Sector name</div>
          <input className="input" value={sectorName} onChange={(e) => setSectorName(e.target.value)} placeholder="Sector A / Bhakti Vriksha" />
        </div>
        <button className="btn secondary" type="button" onClick={saveSector} disabled={saving}>
          {saving ? "Saving..." : "Save sector"}
        </button>
      </div>
    </div>
  );
}


export function DashboardClient({
  role,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserImage,
  currentUserSectorName,
  initialRows,
  visibleUsers,
  initialStart,
  initialEnd,
  initialShowFestivalFlags,
}: {
  role: Role;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  currentUserImage?: string | null;
  currentUserSectorName?: string | null;
  initialRows: DashboardRow[];
  visibleUsers: UserOption[];
  initialStart: string;
  initialEnd: string;
  initialShowFestivalFlags: boolean;
}) {
  const [rows, setRows] = useState<DashboardRow[]>(initialRows);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [selectedUserId, setSelectedUserId] = useState(role === "devotee" ? currentUserId : "all");
  const [newEntryDate, setNewEntryDate] = useState(initialEnd);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showFestivalFlags, setShowFestivalFlags] = useState(initialShowFestivalFlags);
  const [savingSettings, setSavingSettings] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sundayCopied, setSundayCopied] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const quote = pickPrabhupadaQuote(`${currentUserId}-${start}-${end}`);

  function clampToToday(date: string) {
    if (!date) return date;
    return date > today ? today : date;
  }

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        const inRange = row.date >= start && row.date <= end;
        const inUser = selectedUserId === "all" ? true : row.userId === selectedUserId;
        return inRange && inUser;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rows, start, end, selectedUserId]);

  const summary = useMemo(() => {
    const totalScore = filteredRows.reduce((sum, row) => sum + row.totalScore, 0);
    const totalReading = filteredRows.reduce((sum, row) => sum + row.readingMinutes, 0);
    const totalRounds = filteredRows.reduce(
      (sum, row) =>
        sum +
        row.chantBefore630 +
        row.chant630to8 +
        row.chant8to10 +
        row.chant10to9 +
        row.chantAfter9,
      0
    );
    return {
      totalScore,
      totalReading,
      totalRounds,
      totalDays: filteredRows.length,
      avgScore: filteredRows.length ? totalScore / filteredRows.length : 0,
    };
  }, [filteredRows]);

  const teamSummary = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      name: string;
      email: string;
      leaderName: string;
      totalScore: number;
      totalReading: number;
      totalRounds: number;
      daysFilled: number;
    }>();

    filteredRows.forEach((row) => {
      const current = map.get(row.userId) || {
        userId: row.userId,
        name: row.userName,
        email: row.userEmail,
        leaderName: row.leaderName || "General Sector",
        totalScore: 0,
        totalReading: 0,
        totalRounds: 0,
        daysFilled: 0,
      };
      current.totalScore += row.totalScore;
      current.totalReading += row.readingMinutes;
      current.totalRounds += row.chantBefore630 + row.chant630to8 + row.chant8to10 + row.chant10to9 + row.chantAfter9;
      current.daysFilled += 1;
      map.set(row.userId, current);
    });

    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        avgScore: entry.daysFilled ? entry.totalScore / entry.daysFilled : 0,
        sectorName: entry.leaderName ? `${entry.leaderName} Sector` : "General Sector",
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [filteredRows]);

  const groupedBySector = useMemo(() => {
    const map = new Map<string, typeof teamSummary>();
    teamSummary.forEach((entry) => {
      const key = entry.sectorName;
      map.set(key, [...(map.get(key) || []), entry]);
    });
    return Array.from(map.entries()).map(([sectorName, devotees]) => ({
      sectorName,
      devotees,
      teamAverage: devotees.length
        ? devotees.reduce((sum, item) => sum + item.avgScore, 0) / devotees.length
        : 0,
    }));
  }, [teamSummary]);

  const monthlyRows = useMemo(() => {
    const selectedMonth = start.slice(0, 7);
    const dates = daysOfMonth(`${selectedMonth}-01`);
    const sourceRows = rows
      .filter((row) => row.date.startsWith(selectedMonth))
      .filter((row) => (selectedUserId === "all" ? true : row.userId === selectedUserId))
      .sort((a, b) => a.date.localeCompare(b.date));
    return dates.map((date) => sourceRows.find((row) => row.date === date) || null);
  }, [rows, start, selectedUserId]);

  const whatsappText = useMemo(() => {
    const heading =
      role === "devotee"
        ? `🌿 ISKCON Coventry Sadhana Report\n${currentUserName}\nPeriod: ${start} to ${end}`
        : `🌿 ISKCON Coventry ${role === "leader" ? "Leader" : "Temple"} Sadhana Report\nPeriod: ${start} to ${end}`;
    const summaryLines = [
      `Score: ${summary.totalScore}`,
      `Avg / Day: ${summary.avgScore.toFixed(1)}`,
      `Rounds: ${summary.totalRounds}`,
      `Reading: ${summary.totalReading} min`,
      "",
    ];
    const peopleLines =
      role === "devotee"
        ? filteredRows.slice(0, 7).map((row) => `${row.date}: ${row.totalScore} pts, ${row.readingMinutes} min reading`)
        : teamSummary.map((item) => `${item.name}: score ${item.totalScore}, avg ${item.avgScore.toFixed(1)}, days ${item.daysFilled}`);
    return [heading, ...summaryLines, ...peopleLines].join("\n");
  }, [role, currentUserName, start, end, summary, filteredRows, teamSummary]);

  const sundaySummaryText = useMemo(() => {
    const range = getSundayRange(end);
    const sundayRows = filteredRows.filter((row) => row.date >= range.start && row.date <= range.end);
    const sundayScore = sundayRows.reduce((sum, row) => sum + row.totalScore, 0);
    const sundayRounds = sundayRows.reduce((sum, row) => sum + roundsTotal(row), 0);
    const sundayReading = sundayRows.reduce((sum, row) => sum + row.readingMinutes, 0);

    if (role === "devotee") {
      return [
        `🌿 ISKCON Coventry Sunday Sadhana Summary`,
        `${currentUserName}`,
        `Week: ${range.start} to ${range.end}`,
        `Entries: ${sundayRows.length}`,
        `Score: ${sundayScore}`,
        `Rounds: ${sundayRounds}`,
        `Reading: ${sundayReading} min`,
        "",
        ...sundayRows.map((row) => `${row.date}: ${row.totalScore} pts • ${roundsTotal(row)} rounds • ${row.readingMinutes} min`),
      ].join("\n");
    }

    const perPerson = teamSummary.map((item) => {
      const personRows = filteredRows.filter((row) => row.userId === item.userId && row.date >= range.start && row.date <= range.end);
      const score = personRows.reduce((sum, row) => sum + row.totalScore, 0);
      const rounds = personRows.reduce((sum, row) => sum + roundsTotal(row), 0);
      return `${item.name}: ${score} pts • ${rounds} rounds • ${personRows.length} days`;
    });

    return [
      `🌿 ISKCON Coventry Sunday BV Summary`,
      `Week: ${range.start} to ${range.end}`,
      `Team score: ${sundayScore}`,
      `Team rounds: ${sundayRounds}`,
      `Team reading: ${sundayReading} min`,
      "",
      ...perPerson,
    ].join("\n");
  }, [end, filteredRows, role, currentUserName, teamSummary]);

  async function saveRow(row: DashboardRow) {
    setSavingId(row.id);
    const body = { ...row, date: clampToToday(row.date), totalScore: calcTotal(row) };
    const res = await fetch("/api/sadhana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const saved = await res.json();
      setRows((prev) => {
        const idx = prev.findIndex(
          (r) => r.id === row.id || (r.userId === saved.row.userId && r.date === saved.row.date)
        );
        if (idx === -1) return [saved.row, ...prev];
        const next = [...prev];
        next[idx] = saved.row;
        return next;
      });
    } else {
      const data = await res.json().catch(() => ({ error: "Save failed" }));
      alert(data.error || "Save failed");
    }
    setSavingId(null);
  }

  async function createEntry() {
    if (role !== "devotee") return;
    if (!newEntryDate) {
      alert("Please choose a date first.");
      return;
    }

    if (newEntryDate > today) {
      alert("Future date entry is not allowed.");
      setNewEntryDate(today);
      return;
    }

    const existing = rows.find((row) => row.userId === currentUserId && row.date === newEntryDate);
    if (existing) {
      alert("Entry for this date already exists. You can edit it below.");
      setStart((prev) => (prev > newEntryDate ? newEntryDate : prev));
      setEnd((prev) => (prev < newEntryDate ? newEntryDate : prev));
      return;
    }

    const draft = makeBlankRow(currentUserId, currentUserName, currentUserEmail, newEntryDate);
    setCreating(true);
    try {
      const res = await fetch("/api/sadhana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Could not create entry" }));
        alert(data.error || "Could not create entry");
        return;
      }

      const data = await res.json();
      setRows((prev) => [data.row, ...prev]);
      setStart((prev) => (prev > newEntryDate ? newEntryDate : prev));
      setEnd((prev) => (prev < newEntryDate ? newEntryDate : prev));
    } finally {
      setCreating(false);
    }
  }

  async function saveFestivalFlagSetting(nextValue: boolean) {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showFestivalFlags: nextValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Could not save settings" }));
        alert(data.error || "Could not save settings");
        return;
      }
      setShowFestivalFlags(nextValue);
    } finally {
      setSavingSettings(false);
    }
  }

  async function downloadSelection(format: "pdf" | "excel", mode: "period" | "monthly" = "period") {
    setExporting(`${format}-${mode}`);
    try {
      const params = new URLSearchParams({
        format,
        mode,
        start,
        end,
        devoteeId: selectedUserId,
      });
      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Could not export ${format}` }));
        alert(data.error || `Could not export ${format}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const scope = role === "devotee" ? "my-report" : selectedUserId === "all" ? "selection" : selectedUserId;
      a.href = url;
      a.download = `sadhana-${mode}-${scope}-${start}-to-${end}.${format === "pdf" ? "pdf" : "xls"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function copyWhatsappReport() {
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function copySundaySummary() {
    await navigator.clipboard.writeText(sundaySummaryText);
    setSundayCopied(true);
    setTimeout(() => setSundayCopied(false), 1600);
  }

  function updateRow(id: string, patch: Partial<DashboardRow>) {
    const nextPatch = patch.date ? { ...patch, date: clampToToday(patch.date) } : patch;
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, ...nextPatch, totalScore: calcTotal({ ...row, ...nextPatch }) } : row
      )
    );
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ paddingTop: 20, paddingBottom: 20 }}>
        <div className="row" style={{ alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto" }}>
            {currentUserImage ? (
              <img
                src={currentUserImage}
                alt={currentUserName}
                style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 999, border: "3px solid #e7caa3" }}
              />
            ) : (
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  background: "#f5ead7",
                  display: "grid",
                  placeItems: "center",
                  color: "#a44d39",
                  fontWeight: 700,
                  fontSize: 28,
                  border: "3px solid #e7caa3",
                }}
              >
                {currentUserName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 18, color: "#a44d39", marginBottom: 4, fontWeight: 700 }}>हरे कृष्ण</div>
            <div className="label">Hari Bol</div>
            <div className="value" style={{ fontSize: 28 }}>{currentUserName}</div>
            <div className="sub">{currentUserEmail}</div>
            {currentUserSectorName ? <div className="sub">Sector: {currentUserSectorName}</div> : null}
          </div>
          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            <img src="/logo1.jpg" alt="ISKCON Coventry" style={{ width: 120, height: 120, objectFit: "contain" }} />
            <div className="sub" style={{ marginTop: 6 }}>ISKCON Coventry</div>
            <button className="btn secondary" type="button" style={{ marginTop: 10 }} onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out / Use another account
            </button>
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 16,
            background: "#fbf4ea",
            border: "1px solid #eed8bd",
            color: "#6f4b2c",
            fontStyle: "italic",
          }}
        >
          “{quote}” — Srila Prabhupada
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div className="small muted">From</div>
            <input className="input" type="date" max={today} value={start} onChange={(e) => setStart(clampToToday(e.target.value))} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div className="small muted">To</div>
            <input className="input" type="date" max={today} value={end} onChange={(e) => setEnd(clampToToday(e.target.value))} />
          </div>
          {role !== "devotee" && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <div className="small muted">Devotee</div>
              <select className="select" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                <option value="all">All devotees</option>
                {visibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {role === "superadmin" && (
        <div className="card">
          <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700 }}>System settings</div>
              <div className="muted">Toggle Ekadashi and festival fields across dashboard and exports.</div>
            </div>
            <label className="row" style={{ gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={showFestivalFlags} onChange={(e) => saveFestivalFlagSetting(e.target.checked)} disabled={savingSettings} />
              <span>{savingSettings ? "Saving..." : "Show Ekadashi / Festival flag"}</span>
            </label>
          </div>
        </div>
      )}

      {role === "devotee" && (
        <div className="card">
          <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700 }}>Add new daily entry</div>
              <div className="muted">Choose a date, create the row, then fill and save it below.</div>
            </div>
            <div style={{ minWidth: 180 }}>
              <div className="small muted">Entry date</div>
              <input
                className="input"
                type="date"
                max={today}
                value={newEntryDate}
                onChange={(e) => setNewEntryDate(clampToToday(e.target.value))}
                onInput={(e) => {
                  const el = e.target as HTMLInputElement;
                  if (el.value > today) el.value = today;
                }}
              />
            </div>
            <button className="btn orange" onClick={createEntry} disabled={creating}>
              {creating ? "Creating..." : "Add Entry"}
            </button>
          </div>
        </div>
      )}

      <div className="grid2">
        <div className="stat"><div className="label">Score</div><div className="value">{summary.totalScore}</div></div>
        <div className="stat"><div className="label">Avg / Day</div><div className="value">{summary.avgScore.toFixed(1)}</div></div>
        <div className="stat"><div className="label">Rounds</div><div className="value">{summary.totalRounds}</div></div>
        <div className="stat"><div className="label">Reading</div><div className="value">{summary.totalReading} min</div></div>
      </div>

      {(role === "leader" || role === "superadmin") && (
        <>
          <div className="card">
            <div className="row" style={{ marginBottom: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Temple overview</div>
                <div className="muted">Sector grouping and team snapshots for the selected period.</div>
              </div>
              <div className="badge">ISKCON Coventry</div>
            </div>
            <div className="grid" style={{ gap: 12 }}>
              {groupedBySector.length === 0 ? (
                <div className="dayCard">No sector data found in the selected period.</div>
              ) : groupedBySector.map((group) => (
                <div key={group.sectorName} className="dayCard">
                  <div className="row" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{group.sectorName}</div>
                      <div className="muted">{group.devotees.length} devotees</div>
                    </div>
                    <div className="badge">Avg {group.teamAverage.toFixed(1)}</div>
                  </div>
                  <div className="grid" style={{ gap: 8 }}>
                    {group.devotees.map((devotee) => (
                      <div key={devotee.userId} className="row" style={{ justifyContent: "space-between", borderTop: "1px solid #f1e7d7", paddingTop: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{devotee.name}</div>
                          <div className="muted">{devotee.email}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700 }}>{devotee.totalScore}</div>
                          <div className="muted">days {devotee.daysFilled}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{role === "leader" ? "Leader dashboard" : "Temple dashboard"}</div>
                <div className="muted">Quick comparison across devotees for the selected period.</div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button className="btn secondary" type="button" onClick={copyWhatsappReport}>
                  {copied ? "Copied" : "Copy WhatsApp report"}
                </button>
                <button className="btn secondary" type="button" onClick={copySundaySummary}>
                  {sundayCopied ? "Sunday copied" : "Copy Sunday summary"}
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Devotee", "Sector", "Score", "Avg / Day", "Days", "Rounds", "Reading"].map((head) => (
                      <th key={head} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eadcc6", color: "#a44d39" }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamSummary.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 12 }}>No rows found for this period.</td></tr>
                  ) : teamSummary.map((item) => (
                    <tr key={item.userId}>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3eadc" }}>{item.name}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3eadc" }}>{item.sectorName}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3eadc" }}>{item.totalScore}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3eadc" }}>{item.avgScore.toFixed(1)}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3eadc" }}>{item.daysFilled}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3eadc" }}>{item.totalRounds}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3eadc" }}>{item.totalReading} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="row" style={{ marginBottom: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Monthly printable sheet • paper replica</div>
            <div className="muted">A closer paper-style monthly chart layout for the month of {monthLabel(start)}.</div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => downloadSelection("pdf", "monthly")} disabled={exporting !== null}>
              {exporting === "pdf-monthly" ? "Preparing..." : "Monthly PDF"}
            </button>
            <button className="btn secondary" type="button" onClick={() => downloadSelection("excel", "monthly")} disabled={exporting !== null}>
              {exporting === "excel-monthly" ? "Preparing..." : "Monthly Excel"}
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid #e2c8aa", borderRadius: 18, padding: 12, background: "#fffdf8", marginBottom: 12 }}>
          <div className="row" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="label">Sadhana Chart</div>
              <div style={{ fontWeight: 700, color: "#8b3e2f", fontSize: 20 }}>ISKCON Coventry • {monthLabel(start)}</div>
              <div className="muted">HariBol Name: {selectedUserId === "all" ? (role === "devotee" ? currentUserName : "Selected devotees") : (visibleUsers.find((u) => u.id === selectedUserId)?.name || currentUserName)}</div>
              <div className="muted">Leader / Sector: {selectedUserId === "all" ? "Temple selection" : (visibleUsers.find((u) => u.id === selectedUserId)?.sectorName || currentUserSectorName || "Not assigned")}</div>
            </div>
            <div className="badge">हरे कृष्ण</div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#f7e9d3", color: "#8b3e2f" }}>Date</th>
                <th rowSpan={2} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#f7e9d3", color: "#8b3e2f" }}>Day</th>
                <th colSpan={3} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#fee9cc", color: "#8b3e2f" }}>A. Morning Program</th>
                <th colSpan={6} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#fde8e8", color: "#8b3e2f" }}>B. Japa / Rounds</th>
                <th colSpan={3} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#e8f5e9", color: "#8b3e2f" }}>C. Reading</th>
                <th rowSpan={2} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#ede9fe", color: "#8b3e2f" }}>A+B+C</th>
                {showFestivalFlags ? <th rowSpan={2} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#f7e9d3", color: "#8b3e2f" }}>Ekadashi</th> : null}
                {showFestivalFlags ? <th rowSpan={2} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#f7e9d3", color: "#8b3e2f" }}>Note</th> : null}
              </tr>
              <tr>
                {["Mangala","Tulasi","A","<=6:30","6:30-8","8-10","10+","After 9","B","Book","Min","C"].map((head) => (
                  <th key={head} style={{ textAlign: "center", padding: "8px 6px", border: "1px solid #eadcc6", background: "#fff7ed", color: "#8b3e2f" }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyRows.length === 0 ? (
                <tr><td colSpan={16} style={{ padding: 12 }}>No monthly rows found yet.</td></tr>
              ) : monthlyRows.map((row, index) => {
                const date = row?.date || `${start.slice(0,7)}-${String(index + 1).padStart(2, "0")}`;
                return (
                  <tr key={row?.id || `blank-${index}`}>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{dayOnly(date)}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{weekdayShort(date)}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.mangalaArati ? "✓" : ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.tulasiPuja ? "✓" : ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center", fontWeight: 700 }}>{scoreA(row)}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.chantBefore630 ?? ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.chant630to8 ?? ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.chant8to10 ?? ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.chant10to9 ?? ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.chantAfter9 ?? ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center", fontWeight: 700 }}>{scoreB(row)}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc" }}>{row?.readingName || ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.readingMinutes ?? ""}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center", fontWeight: 700 }}>{scoreC(row)}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center", fontWeight: 700, background: "#faf5ff" }}>{row?.totalScore ?? ""}</td>
                    {showFestivalFlags ? <td style={{ padding: "8px 6px", border: "1px solid #f3eadc", textAlign: "center" }}>{row?.ekadashiObserved ? "✓" : ""}</td> : null}
                    {showFestivalFlags ? <td style={{ padding: "8px 6px", border: "1px solid #f3eadc" }}>{row?.festivalNote || ""}</td> : null}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ padding: "8px 6px", border: "1px solid #eadcc6", fontWeight: 700, background: "#fff7ed" }}>Monthly totals</td>
                <td style={{ padding: "8px 6px", border: "1px solid #eadcc6", textAlign: "center", fontWeight: 700 }}>{monthlyRows.reduce((sum, row) => sum + scoreA(row), 0)}</td>
                <td colSpan={5} style={{ padding: "8px 6px", border: "1px solid #eadcc6", textAlign: "center" }}>{monthlyRows.reduce((sum, row) => sum + roundsTotal(row), 0)} rounds</td>
                <td style={{ padding: "8px 6px", border: "1px solid #eadcc6", textAlign: "center", fontWeight: 700 }}>{monthlyRows.reduce((sum, row) => sum + scoreB(row), 0)}</td>
                <td colSpan={2} style={{ padding: "8px 6px", border: "1px solid #eadcc6", textAlign: "center" }}>{monthlyRows.reduce((sum, row) => sum + (row?.readingMinutes || 0), 0)} min</td>
                <td style={{ padding: "8px 6px", border: "1px solid #eadcc6", textAlign: "center", fontWeight: 700 }}>{monthlyRows.reduce((sum, row) => sum + scoreC(row), 0)}</td>
                <td style={{ padding: "8px 6px", border: "1px solid #eadcc6", textAlign: "center", fontWeight: 700, background: "#faf5ff" }}>{monthlyRows.reduce((sum, row) => sum + (row?.totalScore || 0), 0)}</td>
                <td colSpan={2} style={{ padding: "8px 6px", border: "1px solid #eadcc6", textAlign: "center" }}>{monthlyRows.filter((row) => row?.ekadashiObserved).length} Ekadashi</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>
              {role === "devotee" ? "My daily entries" : role === "leader" ? "Leader entries" : "Temple entries"}
            </div>
            <div className="muted">Filtered period report and editable rows</div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => downloadSelection("pdf")} disabled={exporting !== null}>
              {exporting === "pdf-period" ? "Preparing PDF..." : "Download PDF"}
            </button>
            <button className="btn secondary" type="button" onClick={() => downloadSelection("excel")} disabled={exporting !== null}>
              {exporting === "excel-period" ? "Preparing Excel..." : "Download Excel"}
            </button>
            <button className="btn secondary" type="button" onClick={copyWhatsappReport}>
              {copied ? "Copied" : "WhatsApp Summary"}
            </button>
            <button className="btn secondary" type="button" onClick={copySundaySummary}>
              {sundayCopied ? "Sunday copied" : "Sunday BV Summary"}
            </button>
            <div className="badge">{filteredRows.length} rows</div>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="dayCard" style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No entries found for this period</div>
            <div className="muted">
              {role === "devotee"
                ? "Use the Add Entry section above to create your first daily sadhana entry."
                : "Try a wider date range or pick a different devotee."}
            </div>
          </div>
        ) : (
          <div className="grid">
            {filteredRows.map((row) => (
              <div className="dayCard" key={row.id}>
                <div className="row" style={{ marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{row.userName}</div>
                    <div className="muted">{row.date}{row.sectorName ? ` • ${row.sectorName}` : ""}</div>
                  </div>
                  <div className="badge">{row.totalScore}</div>
                </div>

                <div className="grid2">
                  <label className="dayCard" style={{ padding: 10 }}>
                    <input type="checkbox" checked={row.mangalaArati} onChange={(e) => updateRow(row.id, { mangalaArati: e.target.checked })} /> Mangala Arati
                  </label>
                  <label className="dayCard" style={{ padding: 10 }}>
                    <input type="checkbox" checked={row.tulasiPuja} onChange={(e) => updateRow(row.id, { tulasiPuja: e.target.checked })} /> Tulasi Puja
                  </label>
                  {showFestivalFlags ? (
                    <label className="dayCard" style={{ padding: 10 }}>
                      <input type="checkbox" checked={!!row.ekadashiObserved} onChange={(e) => updateRow(row.id, { ekadashiObserved: e.target.checked })} /> Ekadashi Observed
                    </label>
                  ) : null}
                  {showFestivalFlags ? (
                    <div className="dayCard" style={{ padding: 10 }}>
                      <div className="small muted">Festival / Note</div>
                      <input className="input" value={row.festivalNote || ""} onChange={(e) => updateRow(row.id, { festivalNote: e.target.value })} placeholder="Ekadashi / Festival / Special seva" />
                    </div>
                  ) : null}
                </div>

                <div className="grid2" style={{ marginTop: 12 }}>
                  <div><div className="small muted">Date</div><input className="input" type="date" max={today} value={row.date} onChange={(e) => updateRow(row.id, { date: clampToToday(e.target.value) })} /></div>
                  <div><div className="small muted">Up to 6:30</div><input className="input" type="number" value={row.chantBefore630} onChange={(e) => updateRow(row.id, { chantBefore630: Number(e.target.value || 0) })} /></div>
                  <div><div className="small muted">6:30 to 8</div><input className="input" type="number" value={row.chant630to8} onChange={(e) => updateRow(row.id, { chant630to8: Number(e.target.value || 0) })} /></div>
                  <div><div className="small muted">8 to 10</div><input className="input" type="number" value={row.chant8to10} onChange={(e) => updateRow(row.id, { chant8to10: Number(e.target.value || 0) })} /></div>
                  <div><div className="small muted">10 onward</div><input className="input" type="number" value={row.chant10to9} onChange={(e) => updateRow(row.id, { chant10to9: Number(e.target.value || 0) })} /></div>
                  <div><div className="small muted">After 9</div><input className="input" type="number" value={row.chantAfter9} onChange={(e) => updateRow(row.id, { chantAfter9: Number(e.target.value || 0) })} /></div>
                  <div><div className="small muted">Reading Minutes</div><input className="input" type="number" value={row.readingMinutes} onChange={(e) => updateRow(row.id, { readingMinutes: Number(e.target.value || 0) })} /></div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="small muted">Book / Reading Name</div>
                  <input className="input" value={row.readingName} onChange={(e) => updateRow(row.id, { readingName: e.target.value })} />
                </div>

                <button className="btn orange" style={{ marginTop: 12 }} onClick={() => saveRow(row)} disabled={savingId === row.id}>
                  {savingId === row.id ? "Saving..." : "Save Row"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
