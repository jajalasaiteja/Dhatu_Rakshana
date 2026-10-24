"""Professional PDF Report Generator using ReportLab 4.2.5 for Maritime Coating Inspections.

Compliant with ISO 4628, ISO 8501-1, SSPC-PA 2 / ISO 19840, and NACE SP0188.
Produces authoritative, traceable defense inspection reports.
"""

import io
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

from app.core.timezone import format_ist_display, get_ist_now, format_ist_iso

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab import rl_config

rl_config.pageCompression = 0

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
        topMargin=32,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=19,
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
        spaceAfter=8
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=8,
        spaceAfter=4
    )

    subheading_style = ParagraphStyle(
        "SubHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
        spaceBefore=4,
        spaceAfter=2
    )

    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    cell_normal = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.8,
        leading=10,
        textColor=colors.HexColor("#334155")
    )

    cell_mono = ParagraphStyle(
        "CellMono",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )

    notes_style = ParagraphStyle(
        "NotesStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.2,
        leading=9.5,
        textColor=colors.HexColor("#475569")
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("DHATU RAKSHANA (धातु रक्षण)", title_style))
    story.append(Paragraph(
        "DEFENSE MARINE PLATFORM COATING INSPECTION AUDIT REPORT — ISO/AMPP COMPLIANCE",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0d9488"), spaceAfter=8))

    # 2. Key Metadata Summary Table
    insp_id = inspection_data.get("id", "N/A")
    zone_info = inspection_data.get("zone", {})
    zone_name = zone_info.get("name", f"Zone {inspection_data.get('zone_id', '')}")
    zone_desc = zone_info.get("asset_description", "Naval hull strake structure")
    verdict = str(inspection_data.get("overall_verdict", "PENDING")).upper()
    timestamp_str = format_ist_display(inspection_data.get("timestamp"))
    report_gen_time = format_ist_display(get_ist_now(), include_seconds=True)
    engine_ver = inspection_data.get("evaluation_engine_version", "2.0.0-iso-aligned")

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
            Paragraph("<b>Evaluation Date (IST):</b>", cell_bold),
            Paragraph(f"{timestamp_str}", cell_normal)
        ],
        [
            Paragraph("<b>Platform Asset:</b>", cell_bold),
            Paragraph(f"{zone_desc}", cell_normal),
            Paragraph("<b>Evaluation Engine:</b>", cell_bold),
            Paragraph(f"<b>v{engine_ver}</b>", cell_mono)
        ],
        [
            Paragraph("<b>Governing Standards:</b>", cell_bold),
            Paragraph("ISO 4628 • ISO 8501-1 • SSPC-PA 2 • NACE SP0188", cell_normal),
            Paragraph("<b>Report Generated (IST):</b>", cell_bold),
            Paragraph(f"{report_gen_time}", cell_normal)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.3 * inch, 1.4 * inch, 2.4 * inch])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # Extract structured measurements and summary if present
    measurements = inspection_data.get("measurements") or []
    eval_summary = inspection_data.get("evaluation_summary") or {}
    detections = inspection_data.get("detections") or []
    quant = eval_summary.get("quantitative_defect_assessment") or {}

    # 3. Quantitative Defect Assessment Section
    story.append(Paragraph("1. Quantitative Defect Assessment (Raster Geometry)", section_heading))

    total_defects = quant.get("total_defect_count", len(detections))
    total_px = quant.get("total_image_pixels", 409600)
    defect_px = quant.get("total_defect_pixels", 0.0)
    defect_pct = quant.get("cumulative_defect_area_pct", 0.0)
    largest_px = quant.get("largest_defect_area_px", 0.0)
    largest_pct = quant.get("largest_defect_area_pct", 0.0)
    avg_px = quant.get("average_defect_area_px", 0.0)
    spatial_dist = quant.get("spatial_distribution_summary", "Uniform")
    conf_pct = quant.get("assessment_confidence_pct", 100.0)

    quant_rows = [
        [
            Paragraph("<b>Total Defect Count</b>", cell_bold),
            Paragraph(f"{total_defects} anomalies", cell_normal),
            Paragraph("<b>Cumulative Defect Area</b>", cell_bold),
            Paragraph(f"{defect_px:,.1f} px² ({defect_pct:.3f}% of scan)", cell_normal)
        ],
        [
            Paragraph("<b>Largest Detected Defect</b>", cell_bold),
            Paragraph(f"{largest_px:,.1f} px² ({largest_pct:.2f}%)", cell_normal),
            Paragraph("<b>Average Defect Size</b>", cell_bold),
            Paragraph(f"{avg_px:,.1f} px²", cell_normal)
        ],
        [
            Paragraph("<b>Spatial Distribution</b>", cell_bold),
            Paragraph(f"{spatial_dist}", cell_normal),
            Paragraph("<b>Assessment Confidence</b>", cell_bold),
            Paragraph(f"{conf_pct:.1f}% mean confidence", cell_normal)
        ]
    ]

    quant_table = Table(quant_rows, colWidths=[1.5 * inch, 2.1 * inch, 1.5 * inch, 2.3 * inch])
    quant_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(quant_table)
    story.append(Paragraph(
        "<i>Note: All spatial dimensions are explicitly pixel-based (px / px²). Metric conversion (mm²) is rejected without a certified spatial target.</i>",
        notes_style
    ))
    story.append(Spacer(1, 8))

    # 4. Standards-Based Assessment Matrix Section
    story.append(Paragraph("2. Applicable ISO Standards & Degradation Evaluation", section_heading))

    standards_list = eval_summary.get("standards_based_assessment") or []
    if standards_list:
        std_headers = [
            Paragraph("<b>Standard</b>", cell_bold),
            Paragraph("<b>Assessment Criterion</b>", cell_bold),
            Paragraph("<b>Observed Evidence</b>", cell_bold),
            Paragraph("<b>Assigned Rating</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold)
        ]
        std_table_data = [std_headers]

        for item in standards_list:
            std_id = item.get("standard_identifier", "")
            crit = item.get("assessment_criterion", "")
            evid = item.get("observed_evidence", "")
            rating = item.get("assigned_rating", "")
            st = str(item.get("acceptance_status", "")).upper()

            st_color = "#16a34a" if st == "PASS" else ("#d97706" if st in ("REVIEW", "INSUFFICIENT_EVIDENCE") else ("#64748b" if st in ("NOT_MEASURED", "NOT_TESTED") else "#dc2626"))

            std_table_data.append([
                Paragraph(f"<b>{std_id}</b>", cell_bold),
                Paragraph(f"{crit}", cell_normal),
                Paragraph(f"{evid}", cell_normal),
                Paragraph(f"<b>{rating}</b>", cell_normal),
                Paragraph(f"<font color='{st_color}'><b>{st}</b></font>", cell_bold)
            ])

        std_table = Table(std_table_data, colWidths=[1.1 * inch, 1.8 * inch, 2.3 * inch, 1.3 * inch, 0.9 * inch])
        std_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(std_table)
    story.append(Spacer(1, 8))

    # 5. Non-Destructive Physical Testing & Surface Topography
    story.append(Paragraph("3. Physical Testing (SSPC / NACE) & 3D Micro-Topography", section_heading))

    topo = eval_summary.get("surface_topography") or {}
    topo_mesh = "Generated (Binary PLY, SHA-256)" if topo.get("mesh_available") else "Not Available"
    depth_proxy = f"{topo.get('relative_depth_proxy'):.4f}" if topo.get("relative_depth_proxy") is not None else "Not Available"
    roughness_idx = f"{topo.get('roughness_index'):.4f}" if topo.get("roughness_index") is not None else "Not Available"

    ndt_data = [
        [
            Paragraph("<b>SSPC-PA 2 / ISO 19840 DFT:</b>", cell_bold),
            Paragraph("<b>Not measured</b> (Requires calibrated magnetic gauge readings)", cell_normal),
            Paragraph("<b>NACE SP0188 Continuity:</b>", cell_bold),
            Paragraph("<b>Not tested</b> (Requires spark/sponge detector log)", cell_normal)
        ],
        [
            Paragraph("<b>Surface Topography Mesh:</b>", cell_bold),
            Paragraph(f"{topo_mesh}", cell_normal),
            Paragraph("<b>Relative Relief Indices:</b>", cell_bold),
            Paragraph(f"Depth: {depth_proxy} • Roughness: {roughness_idx} <i>(uncalibrated proxy)</i>", cell_normal)
        ]
    ]

    ndt_table = Table(ndt_data, colWidths=[1.8 * inch, 2.1 * inch, 1.6 * inch, 1.9 * inch])
    ndt_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(ndt_table)
    story.append(Spacer(1, 8))

    # 6. Recommendations & Technical Limitations
    story.append(Paragraph("4. Actionable Recommendations & Engineering Limitations", section_heading))

    recs = eval_summary.get("recommendations") or {}
    auto_recs = recs.get("automated_recommendations") or []
    mand_reqs = recs.get("mandatory_standards_requirements") or []

    rec_content = []
    if auto_recs:
        rec_content.append(Paragraph("<b>Automated Operational Recommendations:</b>", subheading_style))
        for r in auto_recs[:3]:
            rec_content.append(Paragraph(f"• {r}", cell_normal))

    if mand_reqs:
        rec_content.append(Paragraph("<b>Mandatory Standards Prerequisite Clauses:</b>", subheading_style))
        for m in mand_reqs[:3]:
            rec_content.append(Paragraph(f"• <b>[Mandatory]</b> {m}", cell_normal))

    lims = eval_summary.get("inspection_summary", {}).get("important_limitations") or []
    if lims:
        rec_content.append(Paragraph("<b>Engineering Assessment Limitations:</b>", subheading_style))
        for l in lims[:3]:
            rec_content.append(Paragraph(f"• {l}", notes_style))

    story.extend(rec_content)
    story.append(Spacer(1, 14))

    # 7. Certification Sign-off Block
    cert_block = [
        [
            Paragraph("<b>Certified Defense Marine Inspector</b><br/><br/>___________________________________<br/>Naval Coatings Quality Assurance Authority", cell_normal),
            Paragraph(f"<b>Automated ISO Evaluation Authority</b><br/><br/><i>Digitally Certified via Dhatu Rakshana Engine v{engine_ver}</i><br/>AMPP QP Marine Audit Standard", cell_normal)
        ]
    ]
    cert_table = Table(cert_block, colWidths=[3.7 * inch, 3.7 * inch])
    cert_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(KeepTogether(cert_table))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
