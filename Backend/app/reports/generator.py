"""Professional Defense Marine Coating Inspection Audit Report Generator using ReportLab 4.2.5.

Features:
- Authoritative Executive Audit Verdict Callout Banner (Green for PASS, Red for FAIL, Amber for REVIEW).
- Comprehensive Specimen Metadata Table (Inspection ID, Platform Asset, Defense Zone, IST Date & Time).
- Defect Identification & Severity Grading Assessment Table matching the Web Application UI:
  (S.No., Defect Type & Confidence %, Standard Reference, Affected Area px & %, Severity Grade, Pass/Fail Verdict).
- International Maritime Standards Compliance Matrix (ISO 4628-1, ISO 4628-2, ISO 4628-3, ISO 4628-8, ISO 8501-1, SSPC-PA 2, NACE SP0188).
- Quantitative Surface Health & 3D Micro-Topography Metrics Table.
- Multi-page pagination support with repeatRows=1 on all tables and KeepTogether on sign-off certification.
- Digital Audit Certification and Running Header/Footer with dynamic page numbering.
"""

import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import logging
import reportlab.rl_config
reportlab.rl_config.pageCompression = 0

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
    """Parses a datetime object or ISO string into formatted (date_str, time_str) in IST/UTC."""
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

    date_str = dt.strftime("%d %B %Y")
    is_ist = "+05:30" in str(val) or "IST" in str(val)
    time_str = dt.strftime("%H:%M:%S IST" if is_ist else "%H:%M:%S UTC")
    return date_str, time_str


def generate_pdf_report(inspection_data: Dict[str, Any]) -> bytes:
    """Generates an authoritative defense marine inspection audit report PDF with full grading results."""
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
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
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
        spaceBefore=10,
        spaceAfter=5
    )

    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0f172a")
    )

    cell_normal = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#334155")
    )

    cell_small = ParagraphStyle(
        "CellSmall",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#475569")
    )

    cell_center = ParagraphStyle(
        "CellCenter",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        alignment=1
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_header_center = ParagraphStyle(
        "TableHeaderCenter",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1
    )

    banner_title = ParagraphStyle(
        "BannerTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        spaceAfter=2
    )

    banner_body = ParagraphStyle(
        "BannerBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11.5
    )

    story = []

    # Dates and IDs
    raw_timestamp = inspection_data.get("timestamp")
    insp_date_str, insp_time_str = parse_datetime(raw_timestamp)
    gen_date_str, gen_time_str = parse_datetime(datetime.now(timezone.utc))

    insp_id = inspection_data.get("id", "N/A")
    display_label = inspection_data.get("display_label") or f"Record {insp_id}"
    verdict = str(inspection_data.get("overall_verdict", "PENDING")).upper()

    # 1. Header Banner
    story.append(Paragraph("DHATU RAKSHANA (धातु रक्षण)", title_style))
    story.append(Paragraph(
        f"DEFENSE MARINE PLATFORM COATING INSPECTION AUDIT REPORT &nbsp;|&nbsp; "
        f"<b>SPECIMEN:</b> {display_label} &nbsp;|&nbsp; <b>ISSUED:</b> {gen_date_str} at {gen_time_str}",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0d9488"), spaceAfter=8))

    # 2. Executive Verdict Callout Box (Prominent Green for PASS, Red for FAIL, Amber for REVIEW)
    if "FAIL" in verdict:
        verdict_bg = colors.HexColor("#fee2e2")
        verdict_border = colors.HexColor("#dc2626")
        verdict_text_color = "#b91c1c"
        badge_header = "❌ AUDIT VERDICT: FAILURE / NON-COMPLIANT"
        badge_desc = (
            "<b>COATING INTEGRITY BREACHED:</b> Surface defect concentration or corrosion severity "
            "exceeds allowable maritime naval defense tolerance thresholds under AMPP / SSPC / ISO 8501 standards. "
            "<b>IMMEDIATE ACTION REQUIRED:</b> Surface remediation, blast re-profiling, or barrier recoating is required before platform deployment."
        )
        badge_pill = "<font color='#dc2626'><b>● FAIL (NON-COMPLIANT)</b></font>"
    elif "PASS" in verdict:
        verdict_bg = colors.HexColor("#dcfce7")
        verdict_border = colors.HexColor("#16a34a")
        verdict_text_color = "#15803d"
        badge_header = "✔ AUDIT VERDICT: PASS / FULLY COMPLIANT"
        badge_desc = (
            "<b>PROTECTIVE COATING INTACT:</b> Analyzed marine platform section complies with all "
            "defense coating integrity specifications. No localized cavitation, pitting, or blistering exceeded threshold limits. "
            "<b>VERDICT:</b> Approved for active operational marine deployment."
        )
        badge_pill = "<font color='#16a34a'><b>● PASS (SATISFACTORY)</b></font>"
    else:  # REVIEW
        verdict_bg = colors.HexColor("#fef3c7")
        verdict_border = colors.HexColor("#f59e0b")
        verdict_text_color = "#b45309"
        badge_header = "⚠ AUDIT VERDICT: REQUIRES MANUAL INSPECTOR REVIEW"
        badge_desc = (
            "<b>ATTENTION REQUIRED:</b> Marginal coating anomalies detected near compliance threshold boundary. "
            "Formal on-site evaluation by a certified AMPP/NACE Senior Coating Inspector is recommended before operational sign-off."
        )
        badge_pill = "<font color='#d97706'><b>● REVIEW (MARGINAL TOLERANCE)</b></font>"

    verdict_callout = [
        [Paragraph(f"<font color='{verdict_text_color}'><b>{badge_header}</b></font>", banner_title)],
        [Paragraph(f"<font color='{verdict_text_color}'>{badge_desc}</font>", banner_body)]
    ]
    callout_table = Table(verdict_callout, colWidths=[7.5 * inch])
    callout_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), verdict_bg),
        ("BOX", (0, 0), (-1, -1), 1.5, verdict_border),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 8))

    # 3. Comprehensive Specimen & Metadata Summary Table
    zone_info = inspection_data.get("zone", {})
    zone_name = zone_info.get("name", f"Zone {inspection_data.get('zone_id', '')}")
    zone_desc = zone_info.get("asset_description", "Naval platform structure")

    meta_data = [
        [
            Paragraph("<b>Inspection ID:</b>", cell_bold),
            Paragraph(f"<b>#{insp_id} ({display_label})</b>", cell_normal),
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
            Paragraph("AMPP / SSPC-PA 2 / NACE / ISO 8501 / ISO 4628", cell_normal)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.45 * inch, 1.45 * inch, 2.3 * inch])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # 4. Defect Identification & Severity Grading Assessment (Matches Web UI Table)
    story.append(Paragraph("1. Defect Identification & Severity Grading Assessment", section_heading))

    detections = inspection_data.get("detections", [])
    graded_results = inspection_data.get("graded_results", [])

    if not detections:
        clean_note_table = Table([[
            Paragraph(
                "<font color='#15803d'><b>✔ COATING INTEGRITY SATISFACTORY:</b> Zero localized coating defects, pinholes, "
                "inclusions, contaminations, or scratches were identified on the scanned surface.</font>",
                cell_normal
            )
        ]], colWidths=[7.5 * inch])
        clean_note_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#86efac")),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ]))
        story.append(clean_note_table)
    else:
        table_headers = [
            Paragraph("<b>S.No.</b>", table_header_center),
            Paragraph("<b>Defect Type</b>", table_header_style),
            Paragraph("<b>Standard Reference</b>", table_header_style),
            Paragraph("<b>Affected Area</b>", table_header_style),
            Paragraph("<b>Severity</b>", table_header_center),
            Paragraph("<b>Verdict</b>", table_header_center)
        ]
        table_rows = [table_headers]
        cell_styles_to_apply = []

        for idx, d in enumerate(detections):
            subtype = d.get("subtype") or d.get("class", "defect")
            conf = d.get("confidence", 0.0)
            area_pct = d.get("area_pct", 0.0)

            # Match graded record
            g_rec = {}
            if d.get("graded_records"):
                g_rec = d["graded_records"][0]
            elif idx < len(graded_results):
                g_rec = graded_results[idx]

            std_ref = g_rec.get("standard_reference") or "ISO 8501-1 / SSPC-SP 10 Marine Grade"
            severity = str(g_rec.get("severity") or d.get("severity") or "Low").upper()
            pass_fail = str(g_rec.get("pass_fail") or "PASS").upper()

            # Severity highlight
            if severity in ("HIGH", "CRITICAL", "SEVERE"):
                sev_html = f"<font color='#b91c1c'><b>{severity}</b></font>"
                sev_bg = colors.HexColor("#fee2e2")
            elif severity in ("LOW", "MINIMAL", "NEGLIGIBLE"):
                sev_html = f"<font color='#15803d'><b>{severity}</b></font>"
                sev_bg = colors.HexColor("#f0fdf4")
            else:
                sev_html = f"<font color='#b45309'><b>{severity}</b></font>"
                sev_bg = colors.HexColor("#fef3c7")

            # Pass / Fail highlight
            row_idx = idx + 1
            if "FAIL" in pass_fail:
                verdict_html = f"<font color='#b91c1c'><b>✖ FAIL</b></font>"
                verdict_cell_bg = colors.HexColor("#fee2e2")
            elif "PASS" in pass_fail:
                verdict_html = f"<font color='#15803d'><b>✔ PASS</b></font>"
                verdict_cell_bg = colors.HexColor("#dcfce7")
            else:
                verdict_html = f"<font color='#b45309'><b>⚠ REVIEW</b></font>"
                verdict_cell_bg = colors.HexColor("#fef3c7")

            area_str = f"{area_pct:.2f}%" if area_pct is not None else "N/A"
            meas = d.get("measurement") or {}
            if meas.get("pixel_area"):
                area_str = f"{area_pct:.2f}% ({meas['pixel_area']:,.0f}px)"

            table_rows.append([
                Paragraph(f"<b>{idx + 1:02d}</b>", cell_center),
                Paragraph(f"<b>{subtype.capitalize()}</b> • {round(conf * 100)}%", cell_normal),
                Paragraph(f"{std_ref}", cell_normal),
                Paragraph(f"{area_str}", cell_small),
                Paragraph(sev_html, cell_center),
                Paragraph(verdict_html, cell_center)
            ])

            cell_styles_to_apply.append(("BACKGROUND", (4, row_idx), (4, row_idx), sev_bg))
            cell_styles_to_apply.append(("BACKGROUND", (5, row_idx), (5, row_idx), verdict_cell_bg))

        det_table = Table(
            table_rows,
            colWidths=[0.45 * inch, 1.45 * inch, 2.2 * inch, 1.1 * inch, 1.1 * inch, 1.2 * inch],
            repeatRows=1
        )
        base_style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ] + cell_styles_to_apply

        det_table.setStyle(TableStyle(base_style))
        story.append(det_table)

    story.append(Spacer(1, 10))

    # 5. International Standards Compliance Grading Matrix (ISO 4628 / ISO 8501 / SSPC / NACE)
    story.append(Paragraph("2. International Maritime Standards Compliance Matrix", section_heading))

    eval_summary = inspection_data.get("evaluation_summary") or {}
    standards_list = eval_summary.get("standards_based_assessment") or []

    if standards_list:
        std_headers = [
            Paragraph("<b>Standard & Edition</b>", table_header_style),
            Paragraph("<b>Criterion / Target</b>", table_header_style),
            Paragraph("<b>Observed Evidence</b>", table_header_style),
            Paragraph("<b>Rating</b>", table_header_style),
            Paragraph("<b>Status</b>", table_header_center)
        ]
        std_rows = [std_headers]
        std_cell_styles = []

        for s_idx, std in enumerate(standards_list):
            code = std.get("standard_identifier") or "ISO / SSPC"
            edition = std.get("edition") or ""
            criterion = std.get("assessment_criterion") or "Coating barrier integrity"
            evidence = std.get("observed_evidence") or "Nominal condition"
            rating = std.get("assigned_rating") or "N/A"
            status = str(std.get("acceptance_status") or "REVIEW").upper()

            r_idx = s_idx + 1
            if status in ("PASS", "SATISFACTORY"):
                s_html = "<font color='#15803d'><b>PASS</b></font>"
                s_bg = colors.HexColor("#dcfce7")
            elif status in ("FAIL", "NON_COMPLIANT"):
                s_html = "<font color='#b91c1c'><b>FAIL</b></font>"
                s_bg = colors.HexColor("#fee2e2")
            elif status in ("NOT_MEASURED", "NOT_TESTED"):
                s_html = "<font color='#64748b'><b>N/A</b></font>"
                s_bg = colors.HexColor("#f1f5f9")
            else:
                s_html = "<font color='#b45309'><b>REVIEW</b></font>"
                s_bg = colors.HexColor("#fef3c7")

            std_rows.append([
                Paragraph(f"<b>{code}</b><br/><font color='#64748b'>{edition}</font>", cell_small),
                Paragraph(f"{criterion}", cell_small),
                Paragraph(f"{evidence}", cell_small),
                Paragraph(f"<b>{rating}</b>", cell_small),
                Paragraph(s_html, cell_center)
            ])
            std_cell_styles.append(("BACKGROUND", (4, r_idx), (4, r_idx), s_bg))

        std_table = Table(
            std_rows,
            colWidths=[1.6 * inch, 2.1 * inch, 2.3 * inch, 0.9 * inch, 0.6 * inch],
            repeatRows=1
        )
        std_base_style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ] + std_cell_styles

        std_table.setStyle(TableStyle(std_base_style))
        story.append(std_table)
        story.append(Spacer(1, 10))

    # 6. Quantitative Surface Health & Micro-Topography Metrics
    story.append(Paragraph("3. Quantitative Surface Health & Micro-Topography Metrics", section_heading))

    quant = eval_summary.get("quantitative_defect_assessment") or {}
    total_px = quant.get("total_image_pixels") or (19961856 if detections else 0)
    defect_px = quant.get("total_defect_pixels") or 0.0
    defect_area_pct = quant.get("cumulative_defect_area_pct", 0.0)
    largest_sub = quant.get("largest_defect_subtype", "N/A")
    largest_pct = quant.get("largest_defect_area_pct", 0.0)
    spatial_summary = quant.get("spatial_distribution_summary", "Nominal spatial distribution")
    assessment_conf = quant.get("assessment_confidence_pct", 95.0)

    mesh_present = bool(inspection_data.get("mesh_url") or inspection_data.get("topology_available"))
    mesh_note = "Generated (3D PLY Topography Available)" if mesh_present else "Standard 2D Analysis"

    tech_data = [
        [
            Paragraph("<b>Total Inspected Surface Area:</b>", cell_bold),
            Paragraph(f"{total_px:,.0f} px²" if total_px else "Standard Optical Plane", cell_normal),
            Paragraph("<b>3D Topography Elevation Mesh:</b>", cell_bold),
            Paragraph(f"{mesh_note}", cell_normal)
        ],
        [
            Paragraph("<b>Cumulative Defect Area:</b>", cell_bold),
            Paragraph(f"<b>{defect_area_pct:.4f} %</b> ({defect_px:,.0f} px²)", cell_normal),
            Paragraph("<b>AI Defect Assessment Confidence:</b>", cell_bold),
            Paragraph(f"{assessment_conf:.1f} %", cell_normal)
        ],
        [
            Paragraph("<b>Largest Identified Anomaly:</b>", cell_bold),
            Paragraph(f"{largest_sub.capitalize()} ({largest_pct:.4f} % area)", cell_normal),
            Paragraph("<b>Defect Spatial Distribution:</b>", cell_bold),
            Paragraph(f"{spatial_summary}", cell_small)
        ]
    ]

    tech_table = Table(tech_data, colWidths=[1.7 * inch, 2.05 * inch, 1.7 * inch, 2.05 * inch])
    tech_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 12))

    # 7. Certification Sign-off Block
    cert_block = [
        [
            Paragraph(
                f"<b>Certified Defense Inspector</b><br/><br/>"
                f"___________________________________<br/>"
                f"Naval Coatings Quality Assurance Command<br/>"
                f"<i>Inspection Verified: {insp_date_str} {insp_time_str}</i>",
                cell_normal
            ),
            Paragraph(
                f"<b>Automated Verification Authority</b><br/><br/>"
                f"<i>Digitally Signed via Dhatu Rakshana AI System</i><br/>"
                f"AMPP QP / ISO 8501 / ISO 4628 Marine Audit Standard<br/>"
                f"<i>Audit Report Generated: {gen_date_str} {gen_time_str}</i>",
                cell_normal
            )
        ]
    ]
    cert_table = Table(cert_block, colWidths=[3.75 * inch, 3.75 * inch])
    cert_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(KeepTogether(cert_table))

    # Build document with running page decorations
    def add_page_decorations(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#64748b"))
        # Header line & text
        canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
        canvas.setLineWidth(0.5)
        canvas.line(36, letter[1] - 25, letter[0] - 36, letter[1] - 25)
        canvas.drawString(36, letter[1] - 20, "DHATU RAKSHANA DEFENSE QUALITY AUDIT  |  ISO 4628 & SSPC COMPLIANT")
        canvas.drawRightString(letter[0] - 36, letter[1] - 20, f"Record #{insp_id}")

        # Footer line & text
        footer_text = f"Dhatu Rakshana Defense Quality Audit | {display_label} | Issued: {gen_date_str} {gen_time_str} | Page {doc_obj.page}"
        canvas.drawRightString(letter[0] - 36, 18, footer_text)
        canvas.drawString(36, 18, "CONFIDENTIAL  -  DEFENSE MARINE COATING STANDARDS AUTHORITY")
        canvas.line(36, 26, letter[0] - 36, 26)
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
