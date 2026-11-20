"""Builds PROJECT_REPORT.docx from the structured Markdown report.

Run with the bundled Python:
  <dependencies>/python/python.exe scripts/build-report.py
Then convert to PDF with office_convert.
"""
from __future__ import annotations

import re
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "PROJECT_REPORT.md"
TARGET = ROOT / "PROJECT_REPORT.docx"

INK = RGBColor(0x10, 0x18, 0x26)
MUTED = RGBColor(0x5B, 0x67, 0x77)
BRAND = RGBColor(0x14, 0x51, 0x3D)

# The DOCX -> PDF converter in this environment mis-decodes typographic
# punctuation, so the report is normalised to print-safe characters.
REPLACEMENTS = {
    "\u2014": "-",
    "\u2013": "-",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2192": "->",
    "\u20b9": "INR ",
    "\u00a0": " ",
    "\u2705 Complete": "Complete",
    "\u2705 Code complete": "Code complete",
    "\u2705 Running": "Running",
    "\u2705 Seeded": "Seeded",
    "\u2705 80 tests": "80 tests",
    "\u2705 schema not applied": "schema not applied",
    "\u26a0\ufe0f Key configured": "Key configured",
    "\u26a0\ufe0f Illustrative index only": "Illustrative index only",
    "\u26a0\ufe0f schema not applied": "schema not applied",
    "\u2705": "OK",
    "\u26a0\ufe0f": "Partial",
    "\ufe0f": "",
}


def normalise(text: str) -> str:
    for source, target in REPLACEMENTS.items():
        text = text.replace(source, target)
    return text



def set_cell_shading(cell, hex_fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tc_pr.append(shd)


def add_inline(paragraph, text: str, size: float | None = None) -> None:
    """Adds **bold**, `code` and plain segments to a paragraph."""
    text = normalise(text)
    tokens = re.split(r"(\*\*.+?\*\*|`.+?`)", text)
    for token in tokens:
        if not token:
            continue
        if token.startswith("**") and token.endswith("**"):
            run = paragraph.add_run(token[2:-2])
            run.bold = True
        elif token.startswith("`") and token.endswith("`"):
            run = paragraph.add_run(token[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt((size or 10) - 0.5)
            run.font.color.rgb = BRAND
        else:
            run = paragraph.add_run(token)
        if size:
            run.font.size = Pt(size)


def add_code_block(doc: Document, lines: list[str]) -> None:
    for line in lines:
        paragraph = doc.add_paragraph()
        paragraph.paragraph_format.left_indent = Inches(0.15)
        paragraph.paragraph_format.space_after = Pt(1)
        run = paragraph.add_run(line if line else " ")
        run.font.name = "Consolas"
        run.font.size = Pt(9)
        run.font.color.rgb = MUTED
        shading = OxmlElement("w:shd")
        shading.set(qn("w:val"), "clear")
        shading.set(qn("w:color"), "auto")
        shading.set(qn("w:fill"), "F2F4F6")
        paragraph._p.get_or_add_pPr().append(shading)


def add_table(doc: Document, rows: list[list[str]]) -> None:
    if not rows:
        return
    columns = max(len(row) for row in rows)
    table = doc.add_table(rows=0, cols=columns)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    for row_index, row in enumerate(rows):
        cells = table.add_row().cells
        tr_pr = table.rows[-1]._tr.get_or_add_trPr()
        cant_split = OxmlElement("w:cantSplit")
        tr_pr.append(cant_split)
        if row_index == 0:
            header = OxmlElement("w:tblHeader")
            tr_pr.append(header)
        for index in range(columns):
            text = row[index] if index < len(row) else ""
            paragraph = cells[index].paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(2)
            add_inline(paragraph, text, size=8.5)
            if row_index == 0:
                for run in paragraph.runs:
                    run.bold = True
                    run.font.color.rgb = INK
                set_cell_shading(cells[index], "E9EEF2")
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def build() -> None:
    doc = Document()
    section = doc.sections[0]
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)

    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.15

    for level, size in ((0, 26), (1, 15), (2, 12)):
        style = doc.styles[f"Heading {level}"] if level else doc.styles["Title"]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = INK if level else BRAND
        style.paragraph_format.space_before = Pt(14 if level else 0)
        style.paragraph_format.space_after = Pt(6)

    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    table_buffer: list[list[str]] = []
    i = 0

    while i < len(lines):
        line = lines[i].rstrip()

        if line.startswith("```"):
            i += 1
            code: list[str] = []
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i].rstrip())
                i += 1
            add_code_block(doc, code)
            i += 1
            continue

        if line.startswith("|"):
            table_buffer = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{2,}:?", cell) for cell in cells):
                    table_buffer.append(cells)
                i += 1
            add_table(doc, table_buffer)
            continue

        if line.startswith("### "):
            doc.add_heading(normalise(line[4:]), level=2)
        elif line.startswith("## "):
            doc.add_heading(normalise(line[3:]), level=1)
        elif line.startswith("# "):
            doc.add_heading(normalise(line[2:]), level=0)
        elif line.startswith("- "):
            paragraph = doc.add_paragraph(style="List Bullet")
            add_inline(paragraph, line[2:])
        elif re.match(r"^\d+\.\s", line):
            paragraph = doc.add_paragraph()
            paragraph.paragraph_format.left_indent = Inches(0.3)
            paragraph.paragraph_format.first_line_indent = Inches(-0.22)
            add_inline(paragraph, line)
        elif line.startswith("---"):
            pass
        elif line.strip() == "":
            pass
        else:
            paragraph = doc.add_paragraph()
            add_inline(paragraph, line)
        i += 1

    footer = section.footer.paragraphs[0]
    footer.text = normalise(
        "Northstar - Career Counsellor Agent · Project Delivery Report"
    )
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in footer.runs:
        run.font.size = Pt(8)
        run.font.color.rgb = MUTED

    doc.core_properties.title = "Northstar — Career Counsellor Agent: Project Delivery Report"
    doc.core_properties.author = "WAECS"
    doc.core_properties.subject = "06 / Education and Careers — Career Counsellor Agent"
    doc.save(TARGET)
    print(f"Wrote {TARGET}")


if __name__ == "__main__":
    build()
