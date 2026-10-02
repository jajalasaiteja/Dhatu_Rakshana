"""Professional PDF Report Generator using ReportLab 4.2.5 for Maritime Coating Inspections."""

import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
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

def generate_pdf_report(inspection_data: Dict[str, Any]) -> bytes:
    """Generates an authoritative, publication-grade defense marine inspection audit report PDF."""
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

    # Custom typography styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0d9488"),
        spaceAfter=12
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=6
    )

    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
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

    story = []

    # 1. Header Banner
    story.append(Paragraph("DHATU RAKSHANA (धातु रक्षण)", title_style))
    story.append(Paragraph("DEFENSE MARINE PLATFORM COATING INSPECTION AUDIT REPORT", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0d9488"), spaceAfter=12))

    # 2. Key Metadata Summary Table
    insp_id = inspection_data.get("id", "N/A")
    zone_info = inspection_data.get("zone", {})
    zone_name = zone_info.get("name", f"Zone {inspection_data.get('zone_id', '')}")
    zone_desc = zone_info.get("asset_description", "Naval hull structure")
    verdict = str(inspection_data.get("overall_verdict", "PENDING")).upper()
    timestamp_str = inspection_data.get("timestamp", datetime.now(timezone.utc).isoformat())

    verdict_color = "#16a34a" if verdict == "PASS" else ("#d97706" if verdict == "REVIEW" else "#dc2626")

    meta_data = [
        [
            Paragraph("<b>Inspection ID:</b>", cell_bold),
            Paragraph(f"#{insp_id}", cell_normal),
            Paragraph("<b>Overall Verdict:</b>", cell_bold),
            Paragraph(f"<font color='{verdict_color}'><b>{verdict}</b></font>", cell_bold)
        ],
        [
            Paragraph("<b>Defense Zone:</b>", cell_bold),
            Paragraph(f"{zone_name}", cell_normal),
            Paragraph("<b>Timestamp:</b>", cell_bold),
            Paragraph(f"{timestamp_str}", cell_normal)
        ],
        [
            Paragraph("<b>Platform Asset:</b>", cell_bold),
            Paragraph(f"{zone_desc}", cell_normal),
            Paragraph("<b>Standards Authority:</b>", cell_bold),
            Paragraph("AMPP / SSPC / NACE / ISO", cell_normal)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.3 * inch, 1.4 * inch, 2.4 * inch])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 3. Defect Detections & Standards Compliance Section
    story.append(Paragraph("Standards Evaluation & Compliance Matrix", section_heading))

    detections = inspection_data.get("detections", [])
    graded_results = inspection_data.get("graded_results", [])

    if not detections:
        story.append(Paragraph(
            "<b>Coating Integrity Intact:</b> No localized corrosion, pinhole, mechanical scratch, "
            "or blister anomalies exceeded naval tolerance thresholds.", cell_normal
        ))
    else:
        table_headers = [
            Paragraph("<b>Defect Subtype</b>", cell_bold),
            Paragraph("<b>Confidence</b>", cell_bold),
            Paragraph("<b>Standard Reference</b>", cell_bold),
            Paragraph("<b>Severity</b>", cell_bold),
            Paragraph("<b>Verdict</b>", cell_bold)
        ]
        table_rows = [table_headers]

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
            pass_fail = g_rec.get("pass_fail", "REVIEW")

            pass_color = "#16a34a" if pass_fail == "PASS" else ("#d97706" if pass_fail == "REVIEW" else "#dc2626")

            table_rows.append([
                Paragraph(f"<b>{subtype.capitalize()}</b>", cell_normal),
                Paragraph(f"{round(conf * 100, 1)}%", cell_normal),
                Paragraph(f"{std_ref}", cell_normal),
                Paragraph(f"{severity}", cell_normal),
                Paragraph(f"<font color='{pass_color}'><b>{pass_fail}</b></font>", cell_normal)
            ])

        det_table = Table(table_rows, colWidths=[1.4 * inch, 1.0 * inch, 2.8 * inch, 1.1 * inch, 1.1 * inch])
        det_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(det_table)

    story.append(Spacer(1, 14))

    # 4. Quantitative Measurements & 3D Topography Section
    story.append(Paragraph("Computer Vision Geometry & Micro-Topography", section_heading))

    mesh_present = bool(inspection_data.get("mesh_url"))
    mesh_note = "Generated (Binary PLY Export Available)" if mesh_present else "Not Available"

    tech_data = [
        [
            Paragraph("<b>Total Defect Count:</b>", cell_bold),
            Paragraph(f"{len(detections)} anomalies", cell_normal),
            Paragraph("<b>3D Surface Mesh:</b>", cell_bold),
            Paragraph(f"{mesh_note}", cell_normal)
        ],
        [
            Paragraph("<b>Primary Image Capture:</b>", cell_bold),
            Paragraph(f"{inspection_data.get('image_url', 'N/A')}", cell_normal),
            Paragraph("<b>Pipeline Engine:</b>", cell_bold),
            Paragraph("Hybrid YOLOv8 + OpenCV Morphology", cell_normal)
        ]
    ]

    tech_table = Table(tech_data, colWidths=[1.6 * inch, 2.1 * inch, 1.5 * inch, 2.2 * inch])
    tech_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(tech_table)

    story.append(Spacer(1, 24))

    # 5. Certification Sign-off Block
    cert_block = [
        [
            Paragraph("<b>Certified Defense Inspector</b><br/><br/>___________________________________<br/>Naval Coatings Quality Assurance", cell_normal),
            Paragraph("<b>Automated Verification Authority</b><br/><br/><i>Digitally Certified via Dhatu Rakshana AI System</i><br/>AMPP QP Marine Audit Standard", cell_normal)
        ]
    ]
    cert_table = Table(cert_block, colWidths=[3.7 * inch, 3.7 * inch])
    cert_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether(cert_table))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
