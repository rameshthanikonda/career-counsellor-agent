import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type {
  Assessment,
  CareerPath,
  Learner,
  PlanWithMilestones,
  Report,
  RiasecScores,
  ShortlistItemView,
} from "@/lib/types";
import { APTITUDE_LABELS, RIASEC_LABELS } from "@/lib/assessment/instruments";
import { GUARDRAIL_NOTE } from "@/lib/reports/narrative";
import type { ClusterFit } from "@/lib/catalogue/matching";

/**
 * Server-side PDF rendering for a counselling report.
 *
 * This module is deliberately deterministic and side-effect free: it reads
 * only the report snapshot, the learner, the shortlist and the plan that the
 * counsellor reviewed. It never invents data. Where a value is missing the
 * PDF says so rather than implying an outcome.
 *
 * pdfkit's built-in fonts are used so the renderer has no font-file
 * dependency. The rupee glyph is not in the WinAnsi set, so amounts are
 * written as "INR 1.5 L" rather than with the ₹ symbol.
 */

const INK = "#101826";
const MUTED = "#5B6777";
const FAINT = "#8A94A3";
const LINE = "#DCE1E7";
const PANEL = "#F5F2EA";
const BRAND = "#14513D";
const BRAND_SOFT = "#E7F0EA";
const BRASS = "#A97E2F";
const CLAY = "#9B3D2E";

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const BOTTOM = PAGE.height - 64;

type Doc = PDFKit.PDFDocument;

export interface ReportPdfInput {
  report: Report;
  learner: Learner;
  assessment: Assessment | null;
  shortlist: ShortlistItemView[];
  plan: PlanWithMilestones | null;
  paths: { path: CareerPath; fit: ClusterFit }[];
  counsellorName: string | null;
  audience: "learner" | "counsellor";
}

function inr(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "Not disclosed";
  if (value >= 10000000) return `INR ${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `INR ${(value / 100000).toFixed(1)} L`;
  if (value >= 1000) return `INR ${Math.round(value / 1000)}k`;
  return `INR ${Math.round(value)}`;
}

function feeRange(min: number, max: number) {
  return min === max ? inr(min) : `${inr(min)} to ${inr(max)}`;
}

function date(iso?: string) {
  if (!iso) return "Not recorded";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function human(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function clean(value: string | undefined | null) {
  if (!value) return "";
  return value
    .replace(/\u20b9/g, "INR ")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u00a0/g, " ");
}

class Writer {
  doc: Doc;
  y: number;
  pageIndex = 1;

  constructor(doc: Doc) {
    this.doc = doc;
    this.y = PAGE.margin;
  }

  get width() {
    return CONTENT_WIDTH;
  }

  ensure(height: number) {
    if (this.y + height <= BOTTOM) return;
    this.doc.addPage();
    this.pageIndex += 1;
    this.y = PAGE.margin;
  }

  gap(height = 12) {
    this.y += height;
  }

  heading(text: string, eyebrow?: string) {
    this.ensure(54);
    if (eyebrow) {
      this.doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(BRAND)
        .text(eyebrow.toUpperCase(), PAGE.margin, this.y, {
          characterSpacing: 1.1,
        });
      this.y += 13;
    }
    this.doc
      .font("Helvetica-Bold")
      .fontSize(17)
      .fillColor(INK)
      .text(clean(text), PAGE.margin, this.y, { width: CONTENT_WIDTH });
    this.y = this.doc.y + 6;
    this.doc
      .moveTo(PAGE.margin, this.y)
      .lineTo(PAGE.margin + CONTENT_WIDTH, this.y)
      .lineWidth(0.8)
      .strokeColor(LINE)
      .stroke();
    this.y += 12;
  }

  subheading(text: string) {
    this.ensure(28);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(INK)
      .text(clean(text), PAGE.margin, this.y, { width: CONTENT_WIDTH });
    this.y = this.doc.y + 4;
  }

  paragraph(text: string, options: { size?: number; color?: string; width?: number } = {}) {
    const size = options.size ?? 9.5;
    const width = options.width ?? CONTENT_WIDTH;
    const height = this.doc
      .font("Helvetica")
      .fontSize(size)
      .heightOfString(clean(text), { width, lineGap: 2.4 });
    this.ensure(height + 4);
    this.doc
      .font("Helvetica")
      .fontSize(size)
      .fillColor(options.color ?? MUTED)
      .text(clean(text), PAGE.margin, this.y, { width, lineGap: 2.4 });
    this.y = this.doc.y + 4;
  }

  bullets(items: string[], options: { size?: number; color?: string } = {}) {
    const size = options.size ?? 9.3;
    for (const item of items) {
      const width = CONTENT_WIDTH - 14;
      const height = this.doc
        .font("Helvetica")
        .fontSize(size)
        .heightOfString(clean(item), { width, lineGap: 2.2 });
      this.ensure(height + 5);
      this.doc
        .circle(PAGE.margin + 3, this.y + size * 0.62, 1.6)
        .fill(BRAND);
      this.doc
        .font("Helvetica")
        .fontSize(size)
        .fillColor(options.color ?? MUTED)
        .text(clean(item), PAGE.margin + 12, this.y, { width, lineGap: 2.2 });
      this.y = this.doc.y + 3;
    }
    this.y += 2;
  }

  callout(title: string, body: string, tone: "brand" | "warn" = "brand") {
    const size = 8.8;
    const inner = CONTENT_WIDTH - 24;
    const bodyHeight = this.doc
      .font("Helvetica")
      .fontSize(size)
      .heightOfString(clean(body), { width: inner, lineGap: 2.2 });
    const height = bodyHeight + 30;
    this.ensure(height + 6);
    this.doc
      .roundedRect(PAGE.margin, this.y, CONTENT_WIDTH, height, 6)
      .fill(tone === "brand" ? BRAND_SOFT : "#FBF0E4");
    this.doc
      .font("Helvetica-Bold")
      .fontSize(7.6)
      .fillColor(tone === "brand" ? BRAND : BRASS)
      .text(title.toUpperCase(), PAGE.margin + 12, this.y + 10, {
        width: inner,
        characterSpacing: 0.8,
      });
    this.doc
      .font("Helvetica")
      .fontSize(size)
      .fillColor(INK)
      .text(clean(body), PAGE.margin + 12, this.y + 22, {
        width: inner,
        lineGap: 2.2,
      });
    this.y += height + 10;
  }

  table(
    columns: { label: string; width: number; align?: "left" | "right" }[],
    rows: string[][],
    options: { size?: number } = {}
  ) {
    const size = options.size ?? 8.2;
    const padding = 6;
    const scale =
      CONTENT_WIDTH / columns.reduce((total, column) => total + column.width, 0);
    const widths = columns.map((column) => column.width * scale);

    const drawHeader = () => {
      this.ensure(26);
      this.doc
        .rect(PAGE.margin, this.y, CONTENT_WIDTH, 20)
        .fill("#EEF1F4");
      let x = PAGE.margin;
      columns.forEach((column, index) => {
        this.doc
          .font("Helvetica-Bold")
          .fontSize(7.2)
          .fillColor(MUTED)
          .text(column.label.toUpperCase(), x + padding, this.y + 6, {
            width: widths[index] - padding * 2,
            align: column.align ?? "left",
            characterSpacing: 0.6,
          });
        x += widths[index];
      });
      this.y += 20;
    };

    drawHeader();

    rows.forEach((row, rowIndex) => {
      const height =
        Math.max(
          ...row.map((cell, index) =>
            this.doc
              .font("Helvetica")
              .fontSize(size)
              .heightOfString(clean(cell), {
                width: widths[index] - padding * 2,
                lineGap: 1.6,
              })
          )
        ) + padding * 2;

      if (this.y + height > BOTTOM) {
        this.doc.addPage();
        this.pageIndex += 1;
        this.y = PAGE.margin;
        drawHeader();
      }

      if (rowIndex % 2 === 1) {
        this.doc
          .rect(PAGE.margin, this.y, CONTENT_WIDTH, height)
          .fill("#FAFBFC");
      }

      let x = PAGE.margin;
      row.forEach((cell, index) => {
        this.doc
          .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
          .fontSize(size)
          .fillColor(index === 0 ? INK : MUTED)
          .text(clean(cell), x + padding, this.y + padding, {
            width: widths[index] - padding * 2,
            align: columns[index].align ?? "left",
            lineGap: 1.6,
          });
        x += widths[index];
      });

      this.y += height;
      this.doc
        .moveTo(PAGE.margin, this.y)
        .lineTo(PAGE.margin + CONTENT_WIDTH, this.y)
        .lineWidth(0.5)
        .strokeColor(LINE)
        .stroke();
    });
    this.y += 8;
  }

  bars(
    rows: { label: string; value: number; caption?: string }[],
    options: { max?: number; color?: string } = {}
  ) {
    const size = 8.4;
    const labelWidth = 112;
    const valueWidth = 34;
    const barWidth = CONTENT_WIDTH - labelWidth - valueWidth - 12;
    for (const row of rows) {
      this.ensure(18);
      this.doc
        .font("Helvetica")
        .fontSize(size)
        .fillColor(INK)
        .text(clean(row.label), PAGE.margin, this.y + 1, {
          width: labelWidth,
        });
      const trackX = PAGE.margin + labelWidth;
      this.doc
        .roundedRect(trackX, this.y + 3, barWidth, 6.5, 3)
        .fill("#E9EDF1");
      const ratio = Math.max(0, Math.min(1, row.value / (options.max ?? 100)));
      if (ratio > 0) {
        this.doc
          .roundedRect(trackX, this.y + 3, barWidth * ratio, 6.5, 3)
          .fill(options.color ?? BRAND);
      }
      this.doc
        .font("Helvetica-Bold")
        .fontSize(size - 0.6)
        .fillColor(MUTED)
        .text(String(Math.round(row.value)), trackX + barWidth + 8, this.y + 1, {
          width: valueWidth,
          align: "right",
        });
      this.y += 14;
      if (row.caption) {
        this.doc
          .font("Helvetica")
          .fontSize(7.4)
          .fillColor(FAINT)
          .text(clean(row.caption), trackX, this.y - 3, { width: barWidth });
        this.y = this.doc.y + 2;
      }
    }
    this.y += 4;
  }
}

function cover(doc: Doc, input: ReportPdfInput, qr: Buffer | null) {
  const { report, learner } = input;
  const dark = "#0E3B2E";
  const cream = "#F7F3EB";

  doc.rect(0, 0, PAGE.width, 336).fill(dark);
  doc.circle(PAGE.width - 40, 28, 130).lineWidth(0.8).strokeColor("#3F6B5A").stroke();
  doc.circle(PAGE.width - 20, 320, 90).lineWidth(0.8).strokeColor("#3F6B5A").stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#FFFFFF")
    .text("NORTHSTAR", PAGE.margin, 48, { characterSpacing: 2.4 });
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#A9C6BA")
    .text("CAREER COUNSELLING BY WAECS", PAGE.margin, 62, { characterSpacing: 1.2 });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#A9C6BA")
    .text("COUNSELLING REPORT", PAGE.margin, 118, { characterSpacing: 1.8 });
  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .fillColor("#FFFFFF")
    .text("Career direction,", PAGE.margin, 136, { width: 360 });
  doc.text("reviewed and signed off.", PAGE.margin, 170, { width: 360 });

  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor("#DCE9E2")
    .text(clean(learner.fullName), PAGE.margin, 220, { width: 340 });
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#A9C6BA")
    .text(
      `${learner.currentEducation} · ${learner.city}, ${learner.country} · target ${learner.targetIntake}`,
      PAGE.margin,
      238,
      { width: 340, lineGap: 2 }
    );

  if (qr) {
    const qrX = PAGE.width - PAGE.margin - 116;
    doc.roundedRect(qrX - 8, 104, 124, 146, 8).fill("#FFFFFF");
    doc.image(qr, qrX, 112, { width: 108, height: 108 });
    doc
      .font("Helvetica-Bold")
      .fontSize(6.2)
      .fillColor(dark)
      .text("SCAN TO VERIFY", qrX - 8, 226, { width: 124, align: "center", characterSpacing: 1 });
    doc
      .font("Helvetica")
      .fontSize(5.8)
      .fillColor("#5B6777")
      .text(report.verificationCode, qrX - 8, 236, { width: 124, align: "center" });
  }

  // Metadata strip
  const stripY = 336;
  doc.rect(0, stripY, PAGE.width, 78).fill(cream);
  const cells: [string, string][] = [
    ["VERSION", `v${report.version}`],
    ["STATUS", human(report.status)],
    ["COUNSELLOR", input.counsellorName ?? "Pending"],
    ["RELEASED", date(report.releasedAt)],
  ];
  const cellWidth = PAGE.width / cells.length;
  cells.forEach(([label, value], index) => {
    const x = index * cellWidth + PAGE.margin;
    doc
      .font("Helvetica")
      .fontSize(6)
      .fillColor(FAINT)
      .text(label, x, stripY + 20, { width: cellWidth - 20, characterSpacing: 1 });
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(INK)
      .text(clean(value), x, stripY + 32, { width: cellWidth - 20 });
  });

  let y = 446;
  doc
    .font("Helvetica")
    .fontSize(7.2)
    .fillColor(FAINT)
    .text("PREPARED FOR", PAGE.margin, y, { characterSpacing: 1.2 });
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(INK)
    .text(clean(learner.fullName), PAGE.margin, y + 12, { width: CONTENT_WIDTH - 180 });
  doc
    .font("Helvetica")
    .fontSize(7.2)
    .fillColor(FAINT)
    .text("VERIFICATION CODE", PAGE.margin + CONTENT_WIDTH - 170, y, {
      characterSpacing: 1.2,
      width: 170,
      align: "right",
    });
  doc
    .font("Courier-Bold")
    .fontSize(13)
    .fillColor(BRAND)
    .text(report.verificationCode, PAGE.margin + CONTENT_WIDTH - 170, y + 12, {
      width: 170,
      align: "right",
    });

  y = 512;
  doc
    .roundedRect(PAGE.margin, y, CONTENT_WIDTH, 96, 8)
    .fill(BRAND_SOFT);
  doc
    .font("Helvetica-Bold")
    .fontSize(7.2)
    .fillColor(BRAND)
    .text("WHAT THIS DOCUMENT IS", PAGE.margin + 16, y + 14, {
      characterSpacing: 1,
    });
  doc
    .font("Helvetica")
    .fontSize(8.6)
    .fillColor(INK)
    .text(
      "Guidance, not a guarantee. It does not promise admission, placement, salary or visa outcomes. Fees, eligibility and outcome bands are indicative and must be verified with each institution. A qualified counsellor reviewed this interpretation before release.",
      PAGE.margin + 16,
      y + 28,
      { width: CONTENT_WIDTH - 32, lineGap: 2.6 }
    );

  // Writing inside the bottom margin makes PDFKit auto-paginate; suppress it
  // while the cover footer is drawn.
  const coverBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  doc
    .moveTo(PAGE.margin, PAGE.height - 86)
    .lineTo(PAGE.margin + CONTENT_WIDTH, PAGE.height - 86)
    .lineWidth(0.7)
    .strokeColor(LINE)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(6.8)
    .fillColor(FAINT)
    .text(
      `Confidential learner data · consent ${learner.consent.version} · generated ${date(new Date().toISOString())}. Quote ${report.verificationCode} to confirm authenticity.`,
      PAGE.margin,
      PAGE.height - 76,
      { width: CONTENT_WIDTH, lineGap: 2 }
    );

  doc.page.margins.bottom = coverBottom;
}

function metricCards(w: Writer, input: ReportPdfInput) {
  const scores = input.assessment?.scores;
  const top = input.paths[0];
  const cards: { label: string; value: string; hint: string }[] = [
    {
      label: "HOLLAND CODE",
      value: scores?.topInterestCode ?? "Not scored",
      hint: "Interest pattern",
    },
    {
      label: "LEADING CLUSTER",
      value: top?.fit.cluster.shortName ?? "Not scored",
      hint: "Best-fit environment",
    },
    {
      label: "FIT SCORE",
      value: top ? `${top.fit.score}/100` : "Not scored",
      hint: "Interest + aptitude + style",
    },
    {
      label: "RESPONSE QUALITY",
      value: scores ? human(scores.quality.band) : "Not scored",
      hint: scores ? `${scores.quality.score}/100` : "No assessment",
    },
  ];
  const gap = 8;
  const width = (CONTENT_WIDTH - gap * 3) / 4;
  w.ensure(68);
  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (width + gap);
    w.doc.roundedRect(x, w.y, width, 58, 6).fill("#F4F7F5");
    w.doc.rect(x, w.y, 3, 58).fill(index === 2 ? BRASS : BRAND);
    w.doc
      .font("Helvetica-Bold")
      .fontSize(5.8)
      .fillColor(FAINT)
      .text(card.label, x + 10, w.y + 10, { width: width - 16, characterSpacing: 0.7 });
    w.doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(INK)
      .text(card.value, x + 10, w.y + 22, { width: width - 16 });
    w.doc
      .font("Helvetica")
      .fontSize(6.2)
      .fillColor(MUTED)
      .text(card.hint, x + 10, w.y + 42, { width: width - 16 });
  });
  w.y += 68;
}

function radarChart(w: Writer, scores: RiasecScores) {
  const keys = ["R", "I", "A", "S", "E", "C"] as const;
  const labels = ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"];
  const height = 224;
  w.ensure(height + 8);
  const cx = PAGE.width / 2;
  const cy = w.y + 104;
  const radius = 72;
  const point = (index: number, ratio: number): [number, number] => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 6;
    return [cx + Math.cos(angle) * radius * ratio, cy + Math.sin(angle) * radius * ratio];
  };

  for (let ring = 1; ring <= 4; ring += 1) {
    const points = keys.map((_, index) => point(index, ring / 4));
    w.doc
      .polygon(...points)
      .lineWidth(0.5)
      .strokeColor(ring === 4 ? "#C9D3CE" : "#E7ECE9")
      .stroke();
  }
  keys.forEach((_, index) => {
    const [x, y] = point(index, 1);
    w.doc.moveTo(cx, cy).lineTo(x, y).lineWidth(0.5).strokeColor("#E1E7E4").stroke();
  });

  const dataPoints = keys.map((key, index) => point(index, Math.max(0.03, scores[key] / 100)));
  const flatData = dataPoints;
  w.doc.save();
  w.doc.polygon(...flatData).fillOpacity(0.18).fill(BRAND);
  w.doc.restore();
  w.doc.polygon(...flatData).lineWidth(1.6).strokeColor(BRAND).stroke();
  keys.forEach((key, index) => {
    const [x, y] = point(index, Math.max(0.03, scores[key] / 100));
    w.doc.circle(x, y, 2.4).fill(BRAND);
  });

  keys.forEach((key, index) => {
    const [x, y] = point(index, 1.28);
    w.doc
      .font("Helvetica-Bold")
      .fontSize(6.4)
      .fillColor(INK)
      .text(labels[index], x - 46, y - 4, { width: 92, align: "center" });
    w.doc
      .font("Helvetica")
      .fontSize(6)
      .fillColor(MUTED)
      .text(`${key} · ${scores[key]}`, x - 46, y + 4, { width: 92, align: "center" });
  });
  w.y += height;
}

function profileSection(w: Writer, input: ReportPdfInput) {
  const scores = input.assessment?.scores;
  w.heading("Assessment profile", "Section 01");
  if (!scores) {
    w.paragraph(
      "No scored assessment is attached to this report. The counsellor should confirm the profile before relying on the interpretation."
    );
    return;
  }

  w.paragraph(
    `Holland code ${scores.topInterestCode}. Interest themes describe what kind of work holds attention; they are preferences, not abilities. Aptitude is a practice-level reasoning screen, and working style is a short self-report.`
  );
  w.gap(6);

  metricCards(w, input);

  w.subheading("Interest radar");
  radarChart(w, scores.interest);

  w.subheading("Theme detail");
  w.bars(
    (Object.keys(scores.interest) as (keyof typeof scores.interest)[])
      .map((key) => ({
        label: RIASEC_LABELS[key].name,
        value: scores.interest[key],
        caption: RIASEC_LABELS[key].blurb,
      }))
      .sort((a, b) => b.value - a.value)
  );

  w.subheading("Aptitude screen");
  w.bars(
    (
      Object.keys(scores.aptitude) as (keyof typeof scores.aptitude)[]
    )
      .filter((key) => key !== "overall")
      .map((key) => ({
        label: APTITUDE_LABELS[key],
        value: scores.aptitude[key],
      }))
      .concat([
        { label: "Overall", value: scores.aptitude.overall },
      ]),
    { color: "#2F6B57" }
  );

  w.subheading("Working style");
  w.bars(
    (
      Object.keys(scores.personality) as (keyof typeof scores.personality)[]
    ).map((key) => ({
      label: human(key),
      value: scores.personality[key],
    })),
    { color: BRASS }
  );

  w.callout(
    `Response quality: ${scores.quality.band} (${scores.quality.score}/100)`,
    scores.quality.flags.length
      ? `${scores.quality.flags.join(" ")} Read the profile as provisional and revisit it with the counsellor.`
      : "Responses showed variation and were completed at a sensible pace. This is a response-quality indicator, not a validity certificate."
  );
  w.gap(2);
}

function clusterSection(w: Writer, input: ReportPdfInput) {
  w.heading("Where the profile points", "Section 02");
  // Several career paths can share a cluster; show each cluster once.
  const seenClusters = new Set<string>();
  const fits: ClusterFit[] = [];
  for (const entry of input.paths) {
    if (seenClusters.has(entry.fit.cluster.id)) continue;
    seenClusters.add(entry.fit.cluster.id);
    fits.push(entry.fit);
  }
  w.paragraph(
    "Cluster fit combines the shape of the interest profile (50%), aptitude weights (30%) and working-style alignment (20%). Scores are relative to this catalogue's cluster definitions, not population percentiles."
  );
  w.gap(4);

  w.table(
    [
      { label: "Cluster", width: 2.1 },
      { label: "Fit", width: 0.6, align: "right" },
      { label: "Interest", width: 0.7, align: "right" },
      { label: "Aptitude", width: 0.7, align: "right" },
      { label: "Style", width: 0.7, align: "right" },
    ],
    fits.slice(0, 6).map((fit) => [
      fit.cluster.name,
      `${fit.score}/100`,
      String(fit.factors.interest),
      String(fit.factors.aptitude),
      String(fit.factors.personality),
    ])
  );

  const leading = input.paths[0];
  if (leading) {
    w.subheading(`Closest career route: ${leading.path.title}`);
    w.paragraph(leading.path.summary);
    w.gap(2);
    w.table(
      [
        { label: "Stage", width: 1.6 },
        { label: "Years", width: 0.7 },
        { label: "Indicative salary band", width: 1.6, align: "right" },
      ],
      leading.path.progression.map((stage) => [
        stage.title,
        `${stage.yearsFrom}-${stage.yearsTo}`,
        `${inr(stage.indicativeSalaryMinINR)} to ${inr(stage.indicativeSalaryMaxINR)}`,
      ]),
      { size: 8 }
    );
    w.paragraph(
      "Salary bands are broad planning ranges, not offers or promises. Demand varies by city, employer and economic cycle.",
      { size: 8, color: FAINT }
    );
  }
}

function shortlistSection(w: Writer, input: ReportPdfInput) {
  w.heading("Shortlist", "Section 03");
  if (input.shortlist.length === 0) {
    w.paragraph(
      "No programmes are on the shortlist yet. The counsellor will add options after reviewing eligibility, budget and preference."
    );
    return;
  }

  w.paragraph(
    `${input.shortlist.length} programmes, ranked on career fit, eligibility, budget and stated preference. Fees and criteria are indicative and must be verified with the institution before applying.`
  );
  w.gap(4);

  w.table(
    [
      { label: "Programme", width: 2.4 },
      { label: "Level / mode", width: 1 },
      { label: "Fee range", width: 1.1, align: "right" },
      { label: "Eligibility", width: 1.1 },
      { label: "Fit", width: 0.5, align: "right" },
    ],
    input.shortlist.map((item) => [
      `${item.course.title}\n${item.course.provider}`,
      `${item.course.level} / ${item.course.modes.map(human).join(", ")}`,
      feeRange(item.course.feeMinINR, item.course.feeMaxINR),
      human(item.eligibility.status),
      `${item.fitScore}`,
    ]),
    { size: 7.8 }
  );

  const conditional = input.shortlist.filter(
    (item) => item.eligibility.status !== "eligible"
  );
  if (conditional.length) {
    w.subheading("What still needs confirmation");
    w.bullets(
      conditional
        .slice(0, 4)
        .map(
          (item) =>
            `${item.course.title}: ${item.eligibility.messages[0] ?? "confirm eligibility with the institution."}`
        ),
      { size: 8.4 }
    );
  }
}

function planSection(w: Writer, input: ReportPdfInput) {
  w.heading("12-month action plan", "Section 04");
  if (!input.plan) {
    w.paragraph(
      "A plan has not been generated for this report yet. The counsellor can create it after the shortlist is agreed."
    );
    return;
  }

  w.paragraph(
    `${input.plan.title}. ${input.plan.objective} Status: ${human(input.plan.status)}. The plan runs from ${date(input.plan.startDate)} to ${date(input.plan.endDate)} and is reviewed each quarter.`
  );
  w.gap(4);

  for (const quarter of [1, 2, 3, 4] as const) {
    const milestones = input.plan.milestones.filter(
      (milestone) => milestone.quarter === quarter
    );
    if (!milestones.length) continue;

    w.ensure(40);
    w.subheading(`Quarter ${quarter}`);
    w.table(
      [
        { label: "Milestone", width: 2.6 },
        { label: "Due", width: 0.9 },
        { label: "Status", width: 0.9 },
      ],
      milestones.map((milestone) => [
        milestone.title,
        date(milestone.dueDate),
        human(milestone.status),
      ]),
      { size: 7.9 }
    );
    w.gap(2);
  }

  w.paragraph(
    "Milestones are reviewed against evidence. If a milestone slips, the counsellor records it and the plan is revised rather than abandoned.",
    { size: 8, color: FAINT }
  );
}

function reviewSection(w: Writer, input: ReportPdfInput) {
  const { report } = input;
  w.heading("Counsellor review", "Section 05");

  w.table(
    [
      { label: "Item", width: 1.6 },
      { label: "Record", width: 3.4 },
    ],
    [
      ["Status", human(report.status)],
      ["Assigned counsellor", input.counsellorName ?? "Pending assignment"],
      ["Submitted for review", date(report.submittedAt)],
      ["Reviewed", date(report.reviewedAt)],
      ["Approved", date(report.approvedAt)],
      ["Released", date(report.releasedAt)],
      ["Verification code", report.verificationCode],
    ],
    { size: 8 }
  );

  if (report.counsellorNotes) {
    w.subheading("Counsellor notes (internal)");
    w.paragraph(report.counsellorNotes);
  }

  if (report.learnerFacingNote) {
    w.subheading("Note for the learner");
    w.paragraph(report.learnerFacingNote, { color: INK });
  }

  if (report.returnedReason) {
    w.subheading("Returned for more information");
    w.paragraph(report.returnedReason);
  }

  w.subheading("Recommended next moves");
  const moves = report.narrative.recommendations.slice(0, 4);
  moves.forEach((move, index) => {
    const width = CONTENT_WIDTH - 24;
    const height = w.doc
      .font("Helvetica")
      .fontSize(9.2)
      .heightOfString(clean(move), { width, lineGap: 2.2 });
    w.ensure(height + 8);
    w.doc
      .circle(PAGE.margin + 7, w.y + 7, 7)
      .fill(BRAND_SOFT);
    w.doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor(BRAND)
      .text(String(index + 1), PAGE.margin + 2, w.y + 3.8, { width: 10, align: "center" });
    w.doc
      .font("Helvetica")
      .fontSize(9.2)
      .fillColor(MUTED)
      .text(clean(move), PAGE.margin + 22, w.y, { width, lineGap: 2.2 });
    w.y = w.doc.y + 5;
  });
  w.gap(4);

  w.callout("Guardrail and limits", GUARDRAIL_NOTE, "warn");

  w.gap(4);
  w.subheading("How to verify this report");
  w.paragraph(
    `Enter the code ${report.verificationCode} at the Northstar verification page. Verification confirms that this version exists in the counselling record; it does not confirm that any admission or placement outcome will follow.`,
    { size: 8.6 }
  );

  const source = input.shortlist[0]?.course.dataSource ?? "illustrative";
  w.gap(2);
  w.paragraph(
    `Catalogue provenance: ${source.replace(/_/g, " ")}. ${
      source === "illustrative"
        ? "This reference build uses an illustrative catalogue; replace it with licensed or institution-verified data before production use."
        : "Records are marked as institution-verified or licensed; always re-check current fees and criteria."
    } Instrument version: ${input.assessment?.instrumentVersion ?? "not recorded"}.`,
    { size: 7.6, color: FAINT }
  );

  // ── Counsellor declaration ─────────────────────────────────
  const boxHeight = 118;
  w.ensure(boxHeight + 22);
  w.gap(8);
  w.doc
    .roundedRect(PAGE.margin, w.y, CONTENT_WIDTH, boxHeight, 6)
    .lineWidth(0.8)
    .strokeColor(LINE)
    .stroke();
  w.doc
    .font("Helvetica-Bold")
    .fontSize(7.4)
    .fillColor(BRAND)
    .text("COUNSELLOR DECLARATION", PAGE.margin + 14, w.y + 14, {
      characterSpacing: 0.8,
    });

  const isReleased = report.status === "released";
  const reviewedBy = input.counsellorName ?? "Pending assignment";
  const declaration = isReleased
    ? `I reviewed the assessment interpretation, shortlist and 12-month plan in this report, and I approved its release to ${input.learner.fullName}. The guidance is evidence-led but does not promise admission, placement, salary or visa outcomes.`
    : `This report is a ${human(report.status).toLowerCase()} copy. It has not been released to the learner. The assigned counsellor is ${reviewedBy}.`;

  w.doc
    .font("Helvetica")
    .fontSize(8.6)
    .fillColor(MUTED)
    .text(clean(declaration), PAGE.margin + 14, w.y + 28, {
      width: CONTENT_WIDTH - 28,
      lineGap: 2.2,
    });

  const lineY = w.y + 88;
  w.doc
    .font("Helvetica")
    .fontSize(7.2)
    .fillColor(FAINT)
    .text("COUNSELLOR", PAGE.margin + 14, lineY, { width: 160 });
  w.doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(INK)
    .text(clean(reviewedBy), PAGE.margin + 14, lineY + 10, { width: 180 });
  w.doc
    .font("Helvetica")
    .fontSize(7.2)
    .fillColor(FAINT)
    .text("DATE OF REVIEW", PAGE.margin + 250, lineY, { width: 120 });
  w.doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(INK)
    .text(date(report.reviewedAt), PAGE.margin + 250, lineY + 10, { width: 140 });
  w.doc
    .font("Helvetica")
    .fontSize(7.2)
    .fillColor(FAINT)
    .text("VERIFICATION CODE", PAGE.margin + 400, lineY, { width: 120 });
  w.doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(INK)
    .text(report.verificationCode, PAGE.margin + 400, lineY + 10, { width: 120 });

  w.y += boxHeight + 10;
  w.paragraph(
    "Questions about this report? Contact WAECS at info@waecs.in or +91 82096 28849, quoting the verification code. Keep this document with your application records.",
    { size: 7.6, color: FAINT }
  );
}

function addChrome(doc: Doc, input: ReportPdfInput) {
  const range = doc.bufferedPageRange();
  const draft = input.report.status !== "released";

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);

    // Writing inside the bottom margin would make pdfkit auto-paginate and
    // spawn blank pages, so the margin is temporarily removed while the
    // footer is drawn.
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    if (index > 0) {
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(FAINT)
        .text(
          `Northstar counselling report · ${input.learner.fullName} · ${input.report.verificationCode}`,
          PAGE.margin,
          30,
          { width: CONTENT_WIDTH - 70, lineBreak: false }
        );
      doc
        .moveTo(PAGE.margin, 44)
        .lineTo(PAGE.margin + CONTENT_WIDTH, 44)
        .lineWidth(0.5)
        .strokeColor(LINE)
        .stroke();
    }

    doc
      .moveTo(PAGE.margin, PAGE.height - 48)
      .lineTo(PAGE.margin + CONTENT_WIDTH, PAGE.height - 48)
      .lineWidth(0.5)
      .strokeColor(LINE)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(6.8)
      .fillColor(FAINT)
      .text("Confidential learner data. Guidance only - no outcome is guaranteed.", PAGE.margin, PAGE.height - 40, {
        width: CONTENT_WIDTH - 60,
      })
      .text(`${index + 1} / ${range.count}`, PAGE.margin + CONTENT_WIDTH - 50, PAGE.height - 40, {
        width: 50,
        align: "right",
      });

    if (draft) {
      doc.save();
      doc.rotate(-32, { origin: [PAGE.width / 2, PAGE.height / 2] });
      doc
        .font("Helvetica-Bold")
        .fontSize(56)
        .fillColor("#9B3D2E")
        .opacity(0.09)
        .text("DRAFT - NOT RELEASED", 0, PAGE.height / 2 - 30, {
          width: PAGE.width,
          align: "center",
        });
      doc.restore();
      doc.opacity(1);
    }

    doc.page.margins.bottom = originalBottom;
  }
}

export async function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin },
    bufferPages: true,
    info: {
      Title: `Northstar counselling report - ${input.learner.fullName}`,
      Author: "Northstar / WAECS",
      Subject: `Counselling report v${input.report.version}`,
      Keywords: `career counselling, ${input.report.verificationCode}`,
      Creator: "Northstar report generator",
    },
  });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const verifyBase = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  ).replace(/\/$/, "");
  let qr: Buffer | null = null;
  try {
    qr = await QRCode.toBuffer(
      `${verifyBase}/verify/${encodeURIComponent(input.report.verificationCode)}`,
      {
        width: 220,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0E3B2E", light: "#FFFFFF" },
      }
    );
  } catch {
    qr = null;
  }

  cover(doc, input, qr);

  doc.addPage();
  const writer = new Writer(doc);
  writer.y = PAGE.margin + 18;

  profileSection(writer, input);
  clusterSection(writer, input);
  shortlistSection(writer, input);
  planSection(writer, input);
  reviewSection(writer, input);

  addChrome(doc, input);
  doc.end();
  return done;
}
