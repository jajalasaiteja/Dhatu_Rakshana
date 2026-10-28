"""Professional PDF Report Generator using ReportLab 4.2.5 for Maritime Coating Inspections.

Features:
- High-visibility color-coded Executive Verdict Banners (Red for FAILURE, Green for PASS, Amber for REVIEW).
- Explicit Inspection Date, Inspection Time, and Report Issuance Date & Time.
- Color-highlighted individual compliance verdicts (Red for FAIL / Non-Compliant, Green for PASS).
- Running header and footer with timestamps and digital audit certification.
"""

import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.core.config import settings

logger = logging.getLogger("dhatu_rakshana.reports")


def parse_datetime(val: Any) -> Tuple[str, str]:
    """Parses a datetime object or ISO string into formatted (date_str, time_str)."""
    dt = None
    if isinstance(val, datetime):
        dt = val
    elif isinstance(val, str) and val.strip():
        clean_val = val.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(clean_val)
        except Exception:
            try:
                dt = datetime.strptime(val[:19], "%Y-%m-%d %H:%M:%S")
            except Exception:
                try:
                    dt = datetime.strptime(val[:10], "%Y-%m-%d")
                except Exception:
                    pass

    if dt is None:
        dt = datetime.now(timezone.utc)

    # Format cleanly
    date_str = dt.strftime("%d %B %Y")
    time_str = dt.strftime("%H:%M:%S UTC")
    return date_str, time_str


def generate_pdf_report(inspection_data: Dict[str, Any]) -> bytes:
    """Generates an authoritative defense marine inspection audit report PDF with green/red status highlights."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Typography styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#0d9488"),
        spaceAfter=10
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=12,
        spaceAfter=6
    )

    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    )

    cell_normal = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#334155")
    )

    cell_center = ParagraphStyle(
        "CellCenter",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        alignment=1  # Center
    )

    banner_title = ParagraphStyle(
        "BannerTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        spaceAfter=2
    )

    banner_body = ParagraphStyle(
        "BannerBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12
    )

    story = []

    # Parse Dates and Times
    raw_timestamp = inspection_data.get("timestamp")
    insp_date_str, insp_time_str = parse_datetime(raw_timestamp)
    gen_date_str, gen_time_str = parse_datetime(datetime.now(timezone.utc))

    insp_id = inspection_data.get("id", "N/A")
    verdict = str(inspection_data.get("overall_verdict", "PENDING")).upper()

    # 1. Header Banner
    story.append(Paragraph("DHATU RAKSHANA (धातु रक्षण)", title_style))
    story.append(Paragraph(
        f"DEFENSE MARINE PLATFORM COATING INSPECTION AUDIT REPORT &nbsp;|&nbsp; "
        f"<b>ISSUED:</b> {gen_date_str} at {gen_time_str}",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0d9488"), spaceAfter=10))

    # 2. Executive Verdict Callout Box (Prominent Green for PASS, Red for FAIL / FAILURE, Amber for REVIEW)
    if "FAIL" in verdict:
        verdict_bg = colors.HexColor("#fee2e2")        # Light red
        verdict_border = colors.HexColor("#dc2626")    # Vivid red
        verdict_text_color = "#b91c1c"                # Deep red
        badge_header = "❌ AUDIT VERDICT: FAILURE / NON-COMPLIANT"
        badge_desc = (
            "<b>COATING INTEGRITY BREACHED:</b> Surface defect concentration or corrosion severity "
            "exceeds allowable maritime naval defense tolerance thresholds under AMPP / SSPC / ISO 8501 standards. "
            "<b>IMMEDIATE ACTION REQUIRED:</b> Surface remediation, blast re-profiling, or barrier recoating is required before platform deployment."
        )
        badge_pill = "<font color='#dc2626'><b>● FAIL (FAILURE / NON-COMPLIANT)</b></font>"
    elif "PASS" in verdict:
        verdict_bg = colors.HexColor("#dcfce7")        # Light green
        verdict_border = colors.HexColor("#16a34a")    # Vivid green
        verdict_text_color = "#15803d"                # Deep green
        badge_header = "✔ AUDIT VERDICT: PASS / FULLY COMPLIANT"
        badge_desc = (
            "<b>PROTECTIVE COATING INTACT:</b> Analyzed marine platform section complies with all "
            "defense coating integrity specifications. No localized cavitation, pitting, or blistering exceeded threshold limits. "
            "<b>VERDICT:</b> Approved for active operational marine deployment."
        )
        badge_pill = "<font color='#16a34a'><b>● PASS (SATISFACTORY)</b></font>"
    else:  # REVIEW
        verdict_bg = colors.HexColor("#fef3c7")        # Light amber
        verdict_border = colors.HexColor("#f59e0b")    # Vivid amber
        verdict_text_color = "#b45309"                # Deep amber
        badge_header = "⚠ AUDIT VERDICT: REQUIRES MANUAL INSPECTOR REVIEW"
        badge_desc = (
            "<b>ATTENTION REQUIRED:</b> Marginal coating anomalies detected near compliance threshold boundary. "
            "Formal on-site evaluation by a certified AMPP/NACE Senior Coating Inspector is recommended before sign-off."
        )
        badge_pill = "<font color='#d97706'><b>● REVIEW (MARGINAL TOLERANCE)</b></font>"

    verdict_callout = [
        [Paragraph(f"<font color='{verdict_text_color}'><b>{badge_header}</b></font>", banner_title)],
        [Paragraph(f"<font color='{verdict_text_color}'>{badge_desc}</font>", banner_body)]
    ]
    callout_table = Table(verdict_callout, colWidths=[7.4 * inch])
    callout_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), verdict_bg),
        ("BOX", (0, 0), (-1, -1), 1.5, verdict_border),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 10))

    # 3. Comprehensive Metadata Summary Table (with explicit Time and Date)
    zone_info = inspection_data.get("zone", {})
    zone_name = zone_info.get("name", f"Zone {inspection_data.get('zone_id', '')}")
    zone_desc = zone_info.get("asset_description", "Naval platform structure")

    meta_data = [
        [
            Paragraph("<b>Inspection ID:</b>", cell_bold),
            Paragraph(f"<b>#{insp_id}</b>", cell_normal),
            Paragraph("<b>Overall Verdict:</b>", cell_bold),
            Paragraph(badge_pill, cell_bold)
        ],
        [
            Paragraph("<b>Inspection Date:</b>", cell_bold),
            Paragraph(f"<b>{insp_date_str}</b>", cell_normal),
            Paragraph("<b>Inspection Time:</b>", cell_bold),
            Paragraph(f"<b>{insp_time_str}</b>", cell_normal)
        ],
        [
            Paragraph("<b>Defense Zone:</b>", cell_bold),
            Paragraph(f"{zone_name}", cell_normal),
            Paragraph("<b>Report Generated:</b>", cell_bold),
            Paragraph(f"{gen_date_str} at {gen_time_str}", cell_normal)
        ],
        [
            Paragraph("<b>Platform Asset:</b>", cell_bold),
            Paragraph(f"{zone_desc}", cell_normal),
            Paragraph("<b>Standards Authority:</b>", cell_bold),
            Paragraph("AMPP / SSPC-PA 2 / NACE / ISO 8501", cell_normal)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.3 * inch, 1.4 * inch, 2.4 * inch])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 4. Defect Detections & Standards Compliance Section
    story.append(Paragraph("Standards Evaluation & Compliance Matrix", section_heading))

    detections = inspection_data.get("detections", [])
    graded_results = inspection_data.get("graded_results", [])

    if not detections:
        clean_note_table = Table([[
            Paragraph(
                "<font color='#15803d'><b>✔ COATING INTEGRITY SATISFACTORY:</b> No localized corrosion, pinhole, "
                "mechanical scratch, or blister anomalies exceeded defense tolerance thresholds.</font>",
                cell_normal
            )
        ]], colWidths=[7.4 * inch])
        clean_note_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#86efac")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(clean_note_table)
    else:
        table_headers = [
            Paragraph("<b>Defect Subtype</b>", cell_bold),
            Paragraph("<b>Confidence</b>", cell_bold),
            Paragraph("<b>Standard Reference</b>", cell_bold),
            Paragraph("<b>Severity</b>", cell_bold),
            Paragraph("<b>Verdict</b>", cell_center)
        ]
        table_rows = [table_headers]
        cell_styles_to_apply = []

        for idx, d in enumerate(detections):
            subtype = d.get("subtype") or d.get("class", "defect")
            conf = d.get("confidence", 0.0)

            # Match graded record
            g_rec = {}
            if d.get("graded_records"):
                g_rec = d["graded_records"][0]
            elif idx < len(graded_results):
                g_rec = graded_results[idx]

            std_ref = g_rec.get("standard_reference", "ISO 8501-1 / SSPC")
            severity = g_rec.get("severity", "Medium")
            pass_fail = str(g_rec.get("pass_fail", "REVIEW")).upper()

            # Severity color highlight
            if severity.lower() in ("high", "critical", "severe"):
                sev_html = f"<font color='#b91c1c'><b>{severity}</b></font>"
            elif severity.lower() in ("low", "minimal", "negligible"):
                sev_html = f"<font color='#15803d'><b>{severity}</b></font>"
            else:
                sev_html = f"<font color='#b45309'><b>{severity}</b></font>"

            # Pass / Fail highlight
            row_idx = idx + 1
            if "FAIL" in pass_fail:
                verdict_html = f"<font color='#b91c1c'><b>FAIL</b></font>"
                verdict_cell_bg = colors.HexColor("#fee2e2")
            elif "PASS" in pass_fail:
                verdict_html = f"<font color='#15803d'><b>PASS</b></font>"
                verdict_cell_bg = colors.HexColor("#dcfce7")
            else:
                verdict_html = f"<font color='#b45309'><b>REVIEW</b></font>"
                verdict_cell_bg = colors.HexColor("#fef3c7")

            table_rows.append([
                Paragraph(f"<b>{subtype.capitalize()}</b>", cell_normal),
                Paragraph(f"{round(conf * 100, 1)}%", cell_normal),
                Paragraph(f"{std_ref}", cell_normal),
                Paragraph(sev_html, cell_normal),
                Paragraph(verdict_html, cell_center)
            ])

            # Color verdict cell in table style
            cell_styles_to_apply.append(("BACKGROUND", (4, row_idx), (4, row_idx), verdict_cell_bg))

        det_table = Table(table_rows, colWidths=[1.4 * inch, 1.0 * inch, 2.7 * inch, 1.1 * inch, 1.2 * inch])
        base_style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ] + cell_styles_to_apply

        det_table.setStyle(TableStyle(base_style))
        story.append(det_table)

    story.append(Spacer(1, 12))

    # 5. Quantitative Measurements & 3D Topography Section
    story.append(Paragraph("Computer Vision Geometry & Micro-Topography", section_heading))

    mesh_present = bool(inspection_data.get("mesh_url") or inspection_data.get("topology_available"))
    mesh_note = "Generated (3D PLY Micro-Topography Available)" if mesh_present else "Standard 2D Analysis"

    tech_data = [
        [
            Paragraph("<b>Total Defect Count:</b>", cell_bold),
            Paragraph(f"<b>{len(detections)} anomalies</b>", cell_normal),
            Paragraph("<b>3D Surface Mesh:</b>", cell_bold),
            Paragraph(f"{mesh_note}", cell_normal)
        ],
        [
            Paragraph("<b>Inspection Date:</b>", cell_bold),
            Paragraph(f"{insp_date_str} at {insp_time_str}", cell_normal),
            Paragraph("<b>Pipeline Engine:</b>", cell_bold),
            Paragraph("Hybrid YOLOv8 + OpenCV Morphology", cell_normal)
        ],
        [
            Paragraph("<b>Specimen Image:</b>", cell_bold),
            Paragraph(f"{inspection_data.get('image_url', 'Captured specimen')}", cell_normal),
            Paragraph("<b>Report Issued:</b>", cell_bold),
            Paragraph(f"{gen_date_str} at {gen_time_str}", cell_normal)
        ]
    ]

    tech_table = Table(tech_data, colWidths=[1.5 * inch, 2.2 * inch, 1.5 * inch, 2.2 * inch])
    tech_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(tech_table)

    story.append(Spacer(1, 18))

    # 6. Certification Sign-off Block
    cert_block = [
        [
            Paragraph(
                f"<b>Certified Defense Inspector</b><br/><br/>"
                f"___________________________________<br/>"
                f"Naval Coatings Quality Assurance<br/>"
                f"<i>Date Verified: {insp_date_str}</i>",
                cell_normal
            ),
            Paragraph(
                f"<b>Automated Verification Authority</b><br/><br/>"
                f"<i>Digitally Signed via Dhatu Rakshana AI System</i><br/>"
                f"AMPP QP Marine Audit Standard Compliance<br/>"
                f"<i>Certified On: {gen_date_str} {gen_time_str}</i>",
                cell_normal
            )
        ]
    ]
    cert_table = Table(cert_block, colWidths=[3.7 * inch, 3.7 * inch])
    cert_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(KeepTogether(cert_table))

    # Build document
    def add_page_decorations(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#64748b"))
        # Header line
        canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
        canvas.setLineWidth(0.5)
        # Footer text
        footer_text = f"Dhatu Rakshana Defense Quality Audit | Inspection #{insp_id} | Issued: {gen_date_str} {gen_time_str} | Page {doc_obj.page}"
        canvas.drawRightString(letter[0] - 36, 20, footer_text)
        canvas.drawString(36, 20, "CONFIDENTIAL - DEFENSE MARINE COATING STANDARDS AUTHORITY")
        canvas.line(36, 28, letter[0] - 36, 28)
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
