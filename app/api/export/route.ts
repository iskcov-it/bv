
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pickPrabhupadaQuote } from "@/lib/quotes";
import { promises as fs } from "fs";
import path from "path";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysOfMonth(monthStart: string) {
  const [year, month] = monthStart.slice(0, 7).split("-").map(Number);
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, i + 1));
    return d.toISOString().slice(0, 10);
  });
}

function weekdayShort(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
}

function scoreA(row: {
  mangalaArati: boolean;
  tulasiPuja: boolean;
} | null) {
  if (!row) return 0;
  return (row.mangalaArati ? 4 : 0) + (row.tulasiPuja ? 4 : 0);
}

function scoreB(row: {
  chantBefore630: number;
  chant630to8: number;
  chant8to10: number;
  chant10to9: number;
  chantAfter9: number;
} | null) {
  if (!row) return 0;
  return row.chantBefore630 * 5 + row.chant630to8 * 4 + row.chant8to10 * 2 + row.chant10to9 - row.chantAfter9;
}

function scoreC(row: { readingMinutes: number } | null) {
  if (!row) return 0;
  const minutes = row.readingMinutes;
  if (minutes >= 60) return 20;
  if (minutes >= 45) return 15;
  if (minutes >= 30) return 10;
  if (minutes >= 15) return 5;
  return 0;
}

function roundsTotal(row: {
  chantBefore630: number;
  chant630to8: number;
  chant8to10: number;
  chant10to9: number;
  chantAfter9: number;
} | null) {
  if (!row) return 0;
  return row.chantBefore630 + row.chant630to8 + row.chant8to10 + row.chant10to9 + row.chantAfter9;
}

function sanitizePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(input: string, maxLen = 88) {
  const words = input.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLen) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function buildPdfReport({
  title,
  subtitle,
  quote,
  rows,
  monthlyMode,
  showFestivalFlags,
}: {
  title: string;
  subtitle: string;
  quote: string;
  monthlyMode?: boolean;
  rows: Array<{
    date: string;
    devotee: string;
    email: string;
    leader: string;
    sector: string;
    mangalaArati: string;
    ekadashiObserved: string;
    festivalNote: string;
    tulasiPuja: string;
    chantBefore630: number;
    chant630to8: number;
    chant8to10: number;
    chant10to9: number;
    chantAfter9: number;
    readingName: string;
    readingMinutes: number;
    totalScore: number;
  }>;
  showFestivalFlags: boolean;
}) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 42;
  const topMargin = 52;
  const lineHeight = monthlyMode ? 16 : 14;
  const contentTopFirstPage = 250;
  const contentTopOtherPages = 72;
  const bottomMargin = 44;

  const logoPath = path.join(process.cwd(), "public", "logo1.jpg");
  const logoBytes = await fs.readFile(logoPath);
  const logoWidth = 180;
  const logoHeight = 180;

  const objects: Buffer[] = [];
  const addObject = (body: string | Buffer) => {
    objects.push(typeof body === "string" ? Buffer.from(body, "binary") : body);
    return objects.length;
  };

  const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const imageObj = addObject(
    Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width 288 /Height 288 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`,
        "binary"
      ),
      logoBytes,
      Buffer.from("\nendstream", "binary"),
    ])
  );

  const pagesRootPlaceholder = addObject("<< /Type /Pages /Count 0 /Kids [] >>");
  const pageObjIds: number[] = [];

  const allLines: string[] = [];
  if (rows.length === 0) {
    allLines.push("No rows found for the selected filters.");
  } else if (monthlyMode) {
    allLines.push(showFestivalFlags
      ? "Date  Day  Mng  Tul  A   <=6:30  6:30-8  8-10  10+  After9  B   Read(min)           C   Total Ek  Note"
      : "Date  Day  Mng  Tul  A   <=6:30  6:30-8  8-10  10+  After9  B   Read(min)           C   Total");
    allLines.push(showFestivalFlags
      ? "---------------------------------------------------------------------------------------------------------------"
      : "------------------------------------------------------------------------------------------------");
    rows.forEach((row) => {
      const raw = {
        mangalaArati: row.mangalaArati === "Yes",
        tulasiPuja: row.tulasiPuja === "Yes",
        chantBefore630: row.chantBefore630,
        chant630to8: row.chant630to8,
        chant8to10: row.chant8to10,
        chant10to9: row.chant10to9,
        chantAfter9: row.chantAfter9,
        readingMinutes: row.readingMinutes,
      };
      const reading = `${row.readingName || "-"} ${row.readingMinutes ? `(${row.readingMinutes}m)` : ""}`.trim().slice(0, 18);
      const note = (row.festivalNote || "").slice(0, 10);
      allLines.push(
        showFestivalFlags
          ? `${row.date.slice(8,10)}    ${weekdayShort(row.date).padEnd(3)}  ${row.mangalaArati === "Yes" ? "✓" : "-"}    ${row.tulasiPuja === "Yes" ? "✓" : "-"}   ${String(scoreA(raw)).padEnd(2)}  ${String(row.chantBefore630).padEnd(6)}  ${String(row.chant630to8).padEnd(7)} ${String(row.chant8to10).padEnd(5)} ${String(row.chant10to9).padEnd(4)} ${String(row.chantAfter9).padEnd(7)} ${String(scoreB(raw)).padEnd(3)} ${reading.padEnd(18)} ${String(scoreC(raw)).padEnd(3)} ${String(row.totalScore).padEnd(5)} ${row.ekadashiObserved === "Yes" ? "✓" : "-"}  ${note}`
          : `${row.date.slice(8,10)}    ${weekdayShort(row.date).padEnd(3)}  ${row.mangalaArati === "Yes" ? "✓" : "-"}    ${row.tulasiPuja === "Yes" ? "✓" : "-"}   ${String(scoreA(raw)).padEnd(2)}  ${String(row.chantBefore630).padEnd(6)}  ${String(row.chant630to8).padEnd(7)} ${String(row.chant8to10).padEnd(5)} ${String(row.chant10to9).padEnd(4)} ${String(row.chantAfter9).padEnd(7)} ${String(scoreB(raw)).padEnd(3)} ${reading.padEnd(18)} ${String(scoreC(raw)).padEnd(3)} ${String(row.totalScore).padEnd(5)}`
      );
    });
  } else {
    rows.forEach((row, index) => {
      allLines.push(`${index + 1}. ${row.date}  |  ${row.devotee}  |  Score: ${row.totalScore}`);
      allLines.push(`   Mangala: ${row.mangalaArati}, Tulasi: ${row.tulasiPuja}${showFestivalFlags ? `, Ekadashi: ${row.ekadashiObserved}` : ""}, Reading: ${row.readingName || "-"} (${row.readingMinutes} min)`);
      allLines.push(`   Rounds: ${row.chantBefore630}/${row.chant630to8}/${row.chant8to10}/${row.chant10to9}/${row.chantAfter9}`);
      if (row.leader) allLines.push(`   Leader: ${row.leader}`);
      if (row.sector) allLines.push(`   Sector: ${row.sector}`);
      if (showFestivalFlags && row.festivalNote) allLines.push(`   Note: ${row.festivalNote}`);
      allLines.push(`   Email: ${row.email}`);
      allLines.push("");
    });
  }

  const wrappedQuote = wrapText(`"${quote}" — Srila Prabhupada`, 70);

  let lineIndex = 0;
  let pageNumber = 0;
  while (lineIndex < allLines.length || pageNumber === 0) {
    pageNumber += 1;
    const commands: string[] = [];
    commands.push("q");
    commands.push(`${logoWidth} 0 0 ${logoHeight} ${marginLeft} ${pageHeight - topMargin - logoHeight} cm`);
    commands.push(`/Im1 Do`);
    commands.push("Q");

    commands.push("BT");
    commands.push(`/F2 24 Tf 0.65 0.30 0.22 rg`);
    commands.push(`1 0 0 1 ${marginLeft + 200} ${pageHeight - 86} Tm (${sanitizePdfText("ISKCON Coventry Sadhana Report")}) Tj`);
    commands.push(`/F1 12 Tf 0.18 0.18 0.18 rg`);
    commands.push(`1 0 0 1 ${marginLeft + 200} ${pageHeight - 106} Tm (${sanitizePdfText(title)}) Tj`);
    commands.push(`1 0 0 1 ${marginLeft + 200} ${pageHeight - 122} Tm (${sanitizePdfText(subtitle)}) Tj`);
    commands.push(`/F2 13 Tf 0.45 0.32 0.17 rg`);
    commands.push(`1 0 0 1 ${marginLeft + 200} ${pageHeight - 150} Tm (${sanitizePdfText(monthlyMode ? "Temple Monthly Sheet" : "Hare Krishna")}) Tj`);
    commands.push(`/F1 10 Tf 0.42 0.35 0.22 rg`);
    wrappedQuote.forEach((line, idx) => {
      commands.push(`1 0 0 1 ${marginLeft + 200} ${pageHeight - 172 - idx * 13} Tm (${sanitizePdfText(line)}) Tj`);
    });
    commands.push("ET");

    const contentTop = pageNumber === 1 ? contentTopFirstPage : contentTopOtherPages;
    const usableHeight = pageHeight - contentTop - bottomMargin;
    const usableLines = Math.floor(usableHeight / lineHeight);
    const chunk = allLines.slice(lineIndex, lineIndex + usableLines);
    lineIndex += chunk.length;

    commands.push("BT");
    commands.push(`/F1 ${monthlyMode ? 9 : 10} Tf 0 0 0 rg`);
    chunk.forEach((line, idx) => {
      const y = pageHeight - contentTop - idx * lineHeight;
      commands.push(`1 0 0 1 ${marginLeft} ${y} Tm (${sanitizePdfText(line)}) Tj`);
    });
    commands.push("ET");

    const stream = commands.join("\n");
    const contentObj = addObject(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
    const pageObj = addObject(
      `<< /Type /Page /Parent ${pagesRootPlaceholder} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> /XObject << /Im1 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`
    );
    pageObjIds.push(pageObj);

    if (lineIndex >= allLines.length) break;
  }

  objects[pagesRootPlaceholder - 1] = Buffer.from(
    `<< /Type /Pages /Count ${pageObjIds.length} /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
    "binary"
  );
  const catalogObj = addObject(`<< /Type /Catalog /Pages ${pagesRootPlaceholder} 0 R >>`);

  let pdf = Buffer.from("%PDF-1.4\n", "binary");
  const offsets: number[] = [0];
  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, Buffer.from(`${index + 1} 0 obj\n`, "binary"), obj, Buffer.from("\nendobj\n", "binary")]);
  });

  const xrefStart = pdf.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pdf = Buffer.concat([pdf, Buffer.from(xref, "binary")]);
  return pdf;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(req.url);
  const appSetting = await prisma.appSetting.upsert({
    where: { key: "global" },
    update: {},
    create: { key: "global", showFestivalFlags: true },
  });
  const showFestivalFlags = appSetting.showFestivalFlags;

  const format = searchParams.get("format") || "pdf";
  const mode = searchParams.get("mode") || "period";
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const devoteeId = searchParams.get("devoteeId") || "all";

  if (!start || !end) {
    return new Response(JSON.stringify({ error: "start and end are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const where: any = {
    date: {
      gte: new Date(`${start}T00:00:00.000Z`),
      lte: new Date(`${end}T23:59:59.999Z`),
    },
  };

  if (session.user.role === "devotee") {
    where.userId = session.user.id;
  } else if (session.user.role === "leader") {
    const allowedUserIds = (await prisma.user.findMany({
      where: { leaderId: session.user.id },
      select: { id: true },
    })).map((u: { id: string }) => u.id);

    if (devoteeId !== "all") {
      if (!allowedUserIds.includes(devoteeId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      where.userId = devoteeId;
    } else {
      where.userId = { in: allowedUserIds.length ? allowedUserIds : ["__none__"] };
    }
  } else if (session.user.role === "superadmin") {
    if (devoteeId !== "all") where.userId = devoteeId;
  }

  const rows = await prisma.sadhanaDay.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          sectorName: true,
          leader: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }, { userId: "asc" }],
  });

  const baseRows = rows.map((r: (typeof rows)[number]) => ({
    date: fmtDate(r.date),
    devotee: r.user.name || "Unnamed devotee",
    email: r.user.email,
    leader: r.user.leader?.name || "",
    sector: (r.user as any).sectorName || "",
    mangalaArati: r.mangalaArati ? "Yes" : "No",
    tulasiPuja: r.tulasiPuja ? "Yes" : "No",
    ekadashiObserved: (r as any).ekadashiObserved ? "Yes" : "No",
    festivalNote: (r as any).festivalNote || "",
    chantBefore630: r.chantBefore630,
    chant630to8: r.chant630to8,
    chant8to10: r.chant8to10,
    chant10to9: r.chant10to9,
    chantAfter9: r.chantAfter9,
    readingName: r.readingName || "",
    readingMinutes: r.readingMinutes,
    totalScore: r.totalScore,
  }));

  const exportRows = mode === "monthly" && devoteeId !== "all"
    ? daysOfMonth(`${start.slice(0, 7)}-01`).map((date) => {
        const row = baseRows.find((item: (typeof baseRows)[number]) => item.date === date);
        return row || {
          date,
          devotee: session.user.name || session.user.email || "Devotee",
          email: session.user.email || "",
          leader: "",
          sector: "",
          mangalaArati: "No",
          tulasiPuja: "No",
          ekadashiObserved: "No",
          festivalNote: "",
          chantBefore630: 0,
          chant630to8: 0,
          chant8to10: 0,
          chant10to9: 0,
          chantAfter9: 0,
          readingName: "",
          readingMinutes: 0,
          totalScore: 0,
        };
      })
    : baseRows;

  const scopeLabel =
    session.user.role === "devotee"
      ? session.user.name || session.user.email || "devotee"
      : devoteeId === "all"
        ? session.user.role === "leader"
          ? "team-report"
          : "all-devotees"
        : exportRows[0]?.devotee || "selected-devotee";

  const filenameBase = `sadhana-${mode}-${scopeLabel}-${start}-to-${end}`.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const quote = pickPrabhupadaQuote(`${scopeLabel}-${start}-${end}-${mode}`);
  const reportTitle = mode === "monthly"
    ? `Paper chart replica • ${scopeLabel}`
    : session.user.role === "devotee"
      ? `Devotee: ${scopeLabel}`
      : `Selection: ${scopeLabel}`;
  const reportSubtitle = `Period: ${start} to ${end} • Rows: ${exportRows.length}`;

  if (format === "excel") {
    const logoPath = path.join(process.cwd(), "public", "logo1.jpg");
    const logoBase64 = (await fs.readFile(logoPath)).toString("base64");

    const rowsHtml = mode === "monthly"
      ? exportRows.map((row: (typeof exportRows)[number]) => {
          const raw = {
            mangalaArati: row.mangalaArati === "Yes",
            tulasiPuja: row.tulasiPuja === "Yes",
            chantBefore630: row.chantBefore630,
            chant630to8: row.chant630to8,
            chant8to10: row.chant8to10,
            chant10to9: row.chant10to9,
            chantAfter9: row.chantAfter9,
            readingMinutes: row.readingMinutes,
          };
          return `<tr>
            <td>${escapeHtml(row.date.slice(8,10))}</td>
            <td>${escapeHtml(weekdayShort(row.date))}</td>
            <td>${row.mangalaArati === "Yes" ? "✓" : ""}</td>
            <td>${row.tulasiPuja === "Yes" ? "✓" : ""}</td>
            <td>${scoreA(raw)}</td>
            <td>${row.chantBefore630}</td>
            <td>${row.chant630to8}</td>
            <td>${row.chant8to10}</td>
            <td>${row.chant10to9}</td>
            <td>${row.chantAfter9}</td>
            <td>${scoreB(raw)}</td>
            <td>${escapeHtml(row.readingName || "")}</td>
            <td>${row.readingMinutes}</td>
            <td>${scoreC(raw)}</td>
            <td>${row.totalScore}</td>
            ${showFestivalFlags ? `<td>${row.ekadashiObserved === "Yes" ? "✓" : ""}</td><td>${escapeHtml(row.festivalNote || "")}</td>` : ""}
          </tr>`;
        }).join("\n")
      : exportRows.map((row: (typeof exportRows)[number]) => `<tr>
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(row.devotee)}</td>
          <td>${escapeHtml(row.email)}</td>
          <td>${escapeHtml(row.leader)}</td>
          <td>${escapeHtml(row.mangalaArati)}</td>
          <td>${escapeHtml(row.tulasiPuja)}</td>
          <td>${row.chantBefore630}</td>
          <td>${row.chant630to8}</td>
          <td>${row.chant8to10}</td>
          <td>${row.chant10to9}</td>
          <td>${row.chantAfter9}</td>
          <td>${escapeHtml(row.readingName)}</td>
          <td>${row.readingMinutes}</td>
          <td>${row.totalScore}</td>
        </tr>`).join("\n");

    const headerCols = mode === "monthly"
      ? ["Date", "Day", "Mangala", "Tulasi", "A", "<=6:30", "6:30-8", "8-10", "10+", "After 9", "B", "Reading", "Minutes", "C", "A+B+C", "Ekadashi", "Festival / Note"]
      : ["Date","Devotee","Email","Leader","Mangala Arati","Tulasi Puja","Rounds up to 6:30","Rounds 6:30 to 8","Rounds 8 to 10","Rounds 10 onward","Rounds after 9","Reading Name","Reading Minutes","Total Score"];

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
body { font-family: Arial, sans-serif; color: #2f2a24; }
.header { display:flex; align-items:center; gap:16px; margin-bottom:18px; }
.logo { width:110px; height:110px; object-fit:contain; }
.title { color:#a44d39; font-size:24px; font-weight:700; }
.subtitle { margin-top:6px; color:#6f4b2c; }
.quote { margin: 12px 0 18px; padding: 12px 14px; background:#fbf4ea; border:1px solid #eed8bd; border-radius:10px; color:#6f4b2c; font-style:italic; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #d8cfbf; padding: 6px; font-size: 12px; }
th { background: #f4a261; color: #111; }
.small { color:#7a6c59; font-size:12px; }
</style>
</head>
<body>
<div class="header">
  <img class="logo" src="data:image/jpeg;base64,${logoBase64}" alt="ISKCON Coventry logo" />
  <div>
    <div class="title">ISKCON Coventry ${mode === "monthly" ? "Paper Chart Replica" : "Sadhana Report"}</div>
    <div class="subtitle">${escapeHtml(reportTitle)}</div>
    <div class="small">${escapeHtml(reportSubtitle)}</div>
    <div class="small">हरे कृष्ण • Hare Krishna</div>
  </div>
</div>
<div class="quote">"${escapeHtml(quote)}" — Srila Prabhupada</div>
<table>
<thead><tr>${headerCols.map((h) => `<th>${escapeHtml(String(h))}</th>`).join("")}</tr></thead>
<tbody>
${rowsHtml}
</tbody>
</table>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.xls"`,
      },
    });
  }

  const pdf = await buildPdfReport({
    title: reportTitle,
    subtitle: reportSubtitle,
    quote,
    rows: exportRows,
    monthlyMode: mode === "monthly",
    showFestivalFlags,
  });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
