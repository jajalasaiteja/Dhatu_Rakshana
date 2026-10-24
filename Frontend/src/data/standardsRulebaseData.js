/**
 * Standards Rulebase Data Store — Project Dhatu Rakshana
 * 
 * Authoritative technical reference data for marine coating inspection.
 * Arranged chronologically in increasing order of publication year:
 * 1. ISO 8501-1:2007 (Year: 2007, Standard: 8501, Part: 1)
 * 2. ISO 4628-8:2012 (Year: 2012, Standard: 4628, Part: 8)
 * 3. ISO 19840:2012  (Year: 2012, Standard: 19840, Part: -)
 * 4. ISO 4628-1:2016 (Year: 2016, Standard: 4628, Part: 1)
 * 5. ISO 8502-3:2017 (Year: 2017, Standard: 8502, Part: 3)
 * 
 * Distinct project guidance:
 * - Project Dhatu Rakshana Coating Defect Framework (DR-FRAMEWORK-2026)
 */

export const STANDARDS_RULEBASE = [
  {
    id: 'iso-8501-1-2007',
    designation: 'ISO 8501-1:2007',
    standardNumber: 'ISO 8501-1',
    publicationYear: 2007,
    standardCode: 8501,
    partNumber: 1,
    edition: 'Second edition (2007-05-01)',
    displayTitle: 'Rust Grades and Preparation Grades of Uncoated Steel Substrates and of Steel Substrates After Overall Removal of Previous Coatings',
    shortNavTitle: 'Rust Grades & Surface Preparation Cleanliness',
    fullOfficialTitle: 'Preparation of steel substrates before application of paints and related products — Visual assessment of surface cleanliness — Part 1: Rust grades and preparation grades of uncoated steel substrates and of steel substrates after overall removal of previous coatings',
    summaryDescription: 'Identifies visual rust grades (A, B, C, D) for uncoated structural steel and establishes surface cleanliness preparation grades following blast-cleaning (Sa), hand and power tool cleaning (St), and flame cleaning (Fl) prior to coating application.',
    type: 'official_iso',
    typeLabel: 'Official ISO Standard',
    scope: 'Identifies four initial rust grades (A, B, C, D) found on uncoated structural steel surfaces and defines visual surface preparation cleanliness grades after blast-cleaning (Sa), hand and power tool cleaning (St), and flame cleaning (Fl). Sets the cleanliness baseline required before protective coating application.',
    inspectionCriteria: [
      {
        label: 'Initial Condition Baseline',
        detail: 'The surface preparation grade achieved depends on the initial rust grade of the steel prior to cleaning. Steel condition must be identified before blast cleaning.'
      },
      {
        label: 'Adhesion Test (Putty Knife Criterion)',
        detail: 'Mill scale, rust, or paint is considered poorly adhering if it can be lifted and removed with a blunt putty knife (Clause 3.1 Note 2).'
      },
      {
        label: 'Soluble Contaminants Limitation',
        detail: 'Dry blast cleaning cannot remove chemical residues, oil film, or water-soluble salts embedded in pits. Soluble salts must be addressed through washing or wet cleaning methods prior to coating (Clause 3.1 Note 1).'
      },
      {
        label: 'Visual Reference Standards',
        detail: 'Surface cleanliness must be compared visually against the reference photographs in officially printed copies of ISO 8501-1 under good natural or artificial illumination.'
      }
    ],
    tables: [
      {
        id: 'table-rust-grades',
        title: 'Initial Rust Grades of Uncoated Steel (Clause 2)',
        description: 'Visual condition of hot-rolled structural steel surfaces prior to cleaning.',
        headers: ['Grade', 'Surface Condition Description', 'Inspection Significance'],
        rows: [
          ['Grade A', 'Steel surface largely covered with adhering mill scale, but little, if any, rust.', 'New mill steel plate. Mill scale is cathodic to steel; if not blasted off, it causes accelerated galvanic blistering.'],
          ['Grade B', 'Steel surface which has begun to rust and from which the mill scale has begun to flake.', 'Atmospherically weathered steel with micro-fissuring in delaminating mill scale.'],
          ['Grade C', 'Steel surface on which the mill scale has rusted away or can be scraped away, with slight pitting visible under normal vision.', 'Extended atmospheric exposure. Localized micro-pitting requires blast profiling to clean pit crevices.'],
          ['Grade D', 'Steel surface on which the mill scale has rusted away and general pitting is visible under normal vision.', 'Severe corrosion degradation. Deep pitting traps moisture and salts; adhesive tape cleanliness tests cannot seal into Grade D pits.']
        ]
      },
      {
        id: 'table-blast-grades',
        title: 'Blast-Cleaning Preparation Grades (Clause 3.1)',
        description: 'Visual cleanliness levels achieved by dry abrasive blast-cleaning (Sa).',
        headers: ['Grade', 'Cleaning Level', 'Visual Cleanliness Requirement'],
        rows: [
          ['Sa 1', 'Light blast-cleaning', 'Free from visible oil, grease and dirt, and from poorly adhering mill scale, rust, paint coatings and foreign matter.'],
          ['Sa 2', 'Thorough blast-cleaning', 'Almost all mill scale, rust, paint and foreign matter removed. Any residual contamination shall be firmly adhering.'],
          ['Sa 2½', 'Very thorough blast-cleaning', 'Mill scale, rust, paint and foreign matter removed so that only minute shadows, streaks or slight stains remain. At least 95 % of each section of surface area must be free of all residues. Primary standard for marine immersion coatings.'],
          ['Sa 3', 'Blast-cleaning to visually clean steel', 'Complete removal of all visible mill scale, rust, paint and foreign matter. Surface exhibits a uniform metallic appearance.']
        ]
      },
      {
        id: 'table-tool-grades',
        title: 'Hand & Power Tool Cleaning Grades (Clause 3.2)',
        description: 'Visual cleanliness achieved by scraping, wire brushing, or mechanical grinding (St).',
        headers: ['Grade', 'Cleaning Level', 'Visual Cleanliness Requirement'],
        rows: [
          ['St 2', 'Thorough hand and power tool cleaning', 'Poorly adhering mill scale, rust, paint coatings and foreign matter removed.'],
          ['St 3', 'Very thorough hand and power tool cleaning', 'As for St 2, but cleaned much more thoroughly until a pronounced metallic sheen arises from the substrate.']
        ]
      }
    ],
    procedure: [
      {
        step: 1,
        title: 'Pre-Cleaning Assessment',
        text: 'Inspect the raw steel substrate under daylight or equivalent lighting. Classify the initial condition into Rust Grade A, B, C, or D.'
      },
      {
        step: 2,
        title: 'Contaminant Screening',
        text: 'Check for heavy grease, oil, or soluble salt deposits. Degrease before blast-cleaning to prevent embedding organic contaminants into the steel profile.'
      },
      {
        step: 3,
        title: 'Blast or Tool Cleaning Execution',
        text: 'Perform abrasive blasting or mechanical tool cleaning to the target preparation grade specified for the coating system.'
      },
      {
        step: 4,
        title: 'Visual Cleanliness Verification',
        text: 'View the prepared surface without magnification. Compare the appearance with the corresponding visual photographic standard (e.g., B Sa 2½, C Sa 2½). Verify that poorly adhering scale has been eliminated using a blunt putty knife where needed.'
      }
    ],
    acceptanceCriteria: {
      hasOfficialCriteria: false,
      summary: 'ISO 8501-1 defines visual surface cleanliness grades; the required grade is dictated by the coating specification.',
      details: 'For marine immersion and high-durability naval coating systems, Sa 2½ (very thorough blast-cleaning) is the mandatory baseline requirement. Sa 3 is specified for ultra-high-performance tank linings, while St 2 / St 3 is restricted to localized touch-up maintenance.'
    }
  },
  {
    id: 'iso-4628-8-2012',
    designation: 'ISO 4628-8:2012',
    standardNumber: 'ISO 4628-8',
    publicationYear: 2012,
    standardCode: 4628,
    partNumber: 8,
    edition: 'Second edition (2012-11-01)',
    displayTitle: 'Assessment of Degree of Delamination and Corrosion Around a Scribe or Other Artificial Defect',
    shortNavTitle: 'Delamination & Corrosion Assessment Around Scribes',
    fullOfficialTitle: 'Paints and varnishes — Evaluation of degradation of coatings — Designation of quantity and size of defects, and of intensity of uniform changes in appearance — Part 8: Assessment of degree of delamination and corrosion around a scribe or other artificial defect',
    summaryDescription: 'Specifies procedures for evaluating delamination (adhesion loss) and substrate corrosion propagating outward from a linear scribe or artificial defect on coated specimens after corrosive exposure.',
    type: 'official_iso',
    typeLabel: 'Official ISO Standard',
    scope: 'Specifies assessment procedures for evaluating delamination (loss of coating adhesion) and substrate corrosion propagating outward from a scribe line or artificial holiday on coated steel after corrosive conditioning (such as neutral salt spray or seawater immersion). Delamination and corrosion are assessed and recorded as distinct parameters.',
    inspectionCriteria: [
      {
        label: 'Damage Separation',
        detail: 'Delamination (detachment of the coating film) and corrosion (oxidation attack of the metal substrate) represent different failure mechanisms and must be measured independently.'
      },
      {
        label: 'Panel Replication',
        detail: 'Assessments must be conducted on a minimum of three individual test panels unless otherwise agreed between interested parties.'
      },
      {
        label: 'Boundary Identification',
        detail: 'The delamination boundary is defined as the transition where the coating becomes tightly adhered to the substrate. Adhesion must be probed beyond the boundary to confirm integrity.'
      },
      {
        label: 'Directional Spread',
        detail: 'Delamination spread and corrosion creep express the average one-sided distance that degradation has advanced into the intact coating beyond the original scribe edge.'
      }
    ],
    tables: [
      {
        id: 'table-scribe-defs',
        title: 'Key Terms & Evaluation Parameters (Clause 3)',
        description: 'Standard terminology for artificial defects and degradation zones.',
        headers: ['Term', 'Clause', 'Standard Definition'],
        rows: [
          ['Scribe', '3.6', 'Linear holiday through the coating, deliberately introduced to expose the underlying metal substrate prior to corrosive exposure'],
          ['Artificial Defect', '3.2', 'Holiday of specified geometry (linear scribe or circular hole) introduced through the film to initiate localized corrosion'],
          ['Delaminated Area', '3.5', 'Area around a defect where loss of coating adhesion from the substrate or undercoat has occurred'],
          ['Corroded Area', '3.4', 'Area around a defect where the underlying metal substrate has suffered corrosive attack']
        ]
      }
    ],
    procedure: [
      {
        step: 1,
        title: 'Panel Retrieval & Immediate Rinsing',
        text: 'Immediately upon removing panels from the exposure chamber and before the surface dries, rinse thoroughly with fresh tap water. If necessary, remove residual moisture with clean compressed air.'
      },
      {
        step: 2,
        title: 'Adhesion Knife Boundary Test',
        text: 'Carefully remove non-adherent coating using a knife blade held at an angle at the coating/substrate interface. Force loose coating away until reaching the boundary where the film is tightly adhered. Alternatively, adhesive tape or compressed air may be used if specified.'
      },
      {
        step: 3,
        title: 'Six-Point Width Measurement',
        text: 'Using a graduated ruler or optical magnifier, measure the total damaged width across the scribe at six uniformly spaced locations (points a through f) to the nearest 0.5 mm. Disregard damage extending beyond the original ends of the scribe line. For scribes under 50 mm, fewer points may be used provided measurement spacing is at least 6 mm.'
      },
      {
        step: 4,
        title: 'Spread & Creep Determination',
        text: 'Calculate the mean overall width of the six points. Subtract the original defect width and divide by two to obtain the average one-sided directional spread (delamination spread or corrosion creep). For irregular or non-uniform damage, an area-integrated evaluation based on total damaged area and defect length is utilized.'
      },
      {
        step: 5,
        title: 'Corrosion Creep Assessment (Stripped or Direct)',
        text: 'Assess corrosion creep on the coated panel by visual contrast. When required by the specification, chemically strip the paint film, rinse and dry the metal surface, immediately apply a protective clear aerosol lacquer to halt subsequent oxidation, and measure substrate corrosion width across the six points.'
      }
    ],
    acceptanceCriteria: {
      hasOfficialCriteria: false,
      summary: 'ISO 4628-8 defines measurement and evaluation procedures; it does not set universal pass/fail thresholds.',
      details: 'Acceptance thresholds (such as maximum allowable delamination spread in millimeters after 720, 1440, or 4200 hours of cyclic salt spray) are defined in qualification specifications such as ISO 12944-6, ISO 12944-9 (offshore coatings), or naval procurement contracts.'
    }
  },
  {
    id: 'iso-19840-2012',
    designation: 'ISO 19840:2012',
    standardNumber: 'ISO 19840',
    publicationYear: 2012,
    standardCode: 19840,
    partNumber: null,
    edition: 'Second edition (2012-09-01)',
    displayTitle: 'Measurement of, and Acceptance Criteria for, the Thickness of Dry Films on Rough Surfaces',
    shortNavTitle: 'Dry-Film Thickness (DFT) & 80/20 Rule',
    fullOfficialTitle: 'Paints and varnishes — Corrosion protection of steel structures by protective paint systems — Measurement of, and acceptance criteria for, the thickness of dry films on rough surfaces',
    summaryDescription: 'Specifies procedures for measuring dry-film thickness on rough blast-cleaned steel surfaces (for nominal DFT ≥ 40 µm), including instrument adjustment, sampling plans, surface profile correction deductions, and mandatory acceptance criteria.',
    type: 'official_iso',
    typeLabel: 'Official ISO Standard',
    scope: 'Specifies the procedure for verifying dry-film thickness against nominal dry-film thickness (NDFT) on blast-cleaned rough steel surfaces (applicable where NDFT is 40 µm or greater). It defines instrument adjustment, sampling plans, surface roughness correction deductions, and official acceptance/rejection criteria.',
    inspectionCriteria: [
      {
        label: 'Nominal Dry-Film Thickness (NDFT)',
        detail: 'The specified thickness for each coat or the whole paint system required to achieve specified protective durability (Clause 3.6).'
      },
      {
        label: 'Individual DFT & Roughness Deduction',
        detail: 'Each gauge reading must be adjusted by subtracting the roughness correction value corresponding to the blast profile to determine the individual DFT above the surface peaks (Clause 3.4 & Clause 7).'
      },
      {
        label: 'Instrument Types',
        detail: 'Measurements are taken with electromagnetic or permanent magnet gauges calibrated on smooth flat steel plates (≥ 3 mm thick) and verified with traceable calibration foils (Clause 5).'
      },
      {
        label: 'Difficult Areas',
        detail: 'Stiffeners, brackets, supports, and pipework require additional random measurements appropriate to their area, in addition to the primary inspection area quota (Clause 6.1).'
      }
    ],
    tables: [
      {
        id: 'table-sampling-plan',
        title: 'Table 1 — Mandatory Sampling Plan (Clause 6.1)',
        description: 'Minimum number of randomly taken thickness measurements required per inspection area.',
        headers: ['Area or Length of Inspection Area', 'Minimum Number of Measurements', 'Maximum Allowed Repeat Measurements'],
        rows: [
          ['Up to 1 m² (or m)', '5 measurements', '1 repeat measurement allowed'],
          ['Above 1 to 3 m²', '10 measurements', '2 repeat measurements allowed'],
          ['Above 3 to 10 m²', '15 measurements', '3 repeat measurements allowed'],
          ['Above 10 to 30 m²', '20 measurements', '4 repeat measurements allowed'],
          ['Above 30 to 100 m²', '30 measurements', '6 repeat measurements allowed'],
          ['Above 100 m²', 'Add 10 for every additional 100 m² (or part thereof)', '20 % of minimum number of measurements']
        ]
      },
      {
        id: 'table-correction-values',
        title: 'Surface Profile Correction Deductions (Clause 7)',
        description: 'Deduction subtracted from gauge readings when instrument is calibrated on smooth flat steel.',
        headers: ['Surface Roughness Profile', 'ISO 8503-1 Comparator Grade', 'Correction Deduction Subtracted'],
        rows: [
          ['Fine profile', 'Ry5 = 20 µm to 30 µm', '10 µm subtracted from gauge reading'],
          ['Medium profile', 'Ry5 = 30 µm to 50 µm (or 40 µm to 75 µm)', '25 µm subtracted from gauge reading'],
          ['Coarse profile', 'Ry5 = 75 µm to 100 µm', '40 µm subtracted from gauge reading'],
          ['Custom profile', 'Determined experimentally per Annex D', 'Measured correction value on uncoated blast-cleaned plate']
        ]
      }
    ],
    procedure: [
      {
        step: 1,
        title: 'Instrument Adjustment & Foil Verification',
        text: 'Adjust gauge to zero on an uncoated smooth flat steel plate (minimum 3 mm thickness, 25 mm diameter). Verify accuracy using traceable certified foils with thicknesses above and below the specified NDFT.'
      },
      {
        step: 2,
        title: 'Inspection Area Delineation & Sampling Quota',
        text: 'Define inspection areas according to project specification (subdivide areas exceeding 1,000 m²). Determine required measurement count from Table 1.'
      },
      {
        step: 3,
        title: 'Thickness Measurement & Roughness Correction',
        text: 'Take random readings perpendicular to the coated plane. Subtract the appropriate roughness correction value (10 µm, 25 µm, or 40 µm) from each raw gauge reading to obtain individual DFTs.'
      },
      {
        step: 4,
        title: 'Repeat Measurement Protocol',
        text: 'If an individual reading falls below 80 % of NDFT, a repeat measurement within 10 mm of the original point is permitted, up to the maximum repeat count permitted in Table 1. If the repeat reading meets the criteria, it replaces the original reading.'
      },
      {
        step: 5,
        title: 'Acceptance Verification',
        text: 'Evaluate dataset against the four mandatory acceptance conditions defined in Clause 9.'
      }
    ],
    acceptanceCriteria: {
      hasOfficialCriteria: true,
      summary: 'ISO 19840 Clause 9 defines strict, mandatory acceptance/rejection criteria (including the 80/20 rule):',
      details: 'All four criteria must be met for an inspection area to be accepted:',
      rules: [
        {
          ruleName: 'Arithmetic Mean Criterion',
          requirement: 'Mean DFT ≥ NDFT',
          description: 'The arithmetic mean of all individual dry-film thickness measurements in the inspection area must be equal to or greater than the specified nominal dry-film thickness.'
        },
        {
          ruleName: '80% Lower Boundary (80/20 Rule)',
          requirement: '≥ 80 % of readings ≥ NDFT',
          description: 'At least 80 percent of all individual dry-film thickness measurements must equal or exceed the nominal dry-film thickness.'
        },
        {
          ruleName: 'Absolute Minimum Threshold',
          requirement: 'All readings ≥ 0.8 × NDFT',
          description: 'The remaining measurements (up to 20 percent) may fall below NDFT, but no individual measurement shall be less than 80 percent of the specified NDFT.'
        },
        {
          ruleName: 'Maximum Thickness Cap',
          requirement: 'Individual DFT ≤ Maximum DFT',
          description: 'No individual reading shall exceed the maximum dry-film thickness specified by the coating manufacturer or contract (typically 3 × NDFT if unspecified).'
        }
      ]
    }
  },
  {
    id: 'iso-4628-1-2016',
    designation: 'ISO 4628-1:2016',
    standardNumber: 'ISO 4628-1',
    publicationYear: 2016,
    standardCode: 4628,
    partNumber: 1,
    edition: 'Fourth edition (2016-01-15)',
    displayTitle: 'General Introduction and Designation System',
    shortNavTitle: 'Defect Quantity & Size Designation System',
    fullOfficialTitle: 'Paints and varnishes — Evaluation of degradation of coatings — Designation of quantity and size of defects, and of intensity of uniform changes in appearance — Part 1: General introduction and designation system',
    summaryDescription: 'Defines a universal numerical rating system (0 to 5) for designating the quantity and size of defects, and the intensity of uniform appearance changes in coatings caused by aging, weathering, or environmental exposure.',
    type: 'official_iso',
    typeLabel: 'Official ISO Standard',
    scope: 'Establishes a universal rating system for designating the quantity and size of coating defects and the intensity of uniform appearance changes (such as yellowing or chalking). It provides the foundational convention used across all subsequent parts of ISO 4628 and serves as the baseline for assessing coating defects not covered by specialized standards.',
    inspectionCriteria: [
      {
        label: 'Viewing Illumination',
        detail: 'Visual assessments must be conducted under standardized illumination in accordance with ISO 13076 (Lighting and procedure for visual assessments of coatings).'
      },
      {
        label: 'Initial Examination',
        detail: 'The initial examination is performed by visual inspection without magnification. Magnification (up to 10×) is utilized only when assessing sub-visual defect size classes (S0 and S1).'
      },
      {
        label: 'Rating Convention',
        detail: 'A uniform scale from 0 to 5 is employed throughout: 0 denotes no defects or changes; 5 denotes severe degradation where further discrimination is not practical. Intermediate half-steps are permissible when specified.'
      },
      {
        label: 'Reporting Format',
        detail: 'Results are formally designated as: defect type; degree of quantity (size rating), followed by the approximate percentage of the affected area (e.g., blistering; degree 2(S2), 5 % area).'
      }
    ],
    tables: [
      {
        id: 'table-1',
        title: 'Table 1 — Rating Scheme for Quantity of Defects (Clause 4.2)',
        description: 'Designates the quantity of discontinuities or localized imperfections scattered across the inspection area in an even distribution.',
        headers: ['Rating', 'Quantity Designation', 'Inspection Meaning'],
        rows: [
          ['0', 'None', 'No detectable defects observed across the inspection area'],
          ['1', 'Very few', 'Small, barely significant number of defects'],
          ['2', 'Few', 'Small but significant number of defects'],
          ['3', 'Moderate', 'Moderate quantity of evenly distributed defects'],
          ['4', 'Considerable', 'Considerable number of defects across the surface'],
          ['5', 'Dense', 'Dense defect pattern; further discrimination is not practical']
        ]
      },
      {
        id: 'table-2',
        title: 'Table 2 — Rating Scheme for Size of Defects (Clause 4.3)',
        description: 'Designates the average order of magnitude of defects. Defects exceeding 0.2 mm are typically visible with normal corrected vision.',
        headers: ['Rating', 'Size Code', 'Visual Boundary & Dimension Threshold', 'Detection Method'],
        rows: [
          ['0', 'S0', 'Not visible under 10× magnification', 'Sub-microscopic; requires optical microscope'],
          ['1', 'S1', 'Only visible under magnification up to 10×', '10× hand lens or optical magnifier'],
          ['2', 'S2', 'Just visible with normal corrected vision (up to 0.2 mm)', 'Normal corrected vision under ISO 13076 lighting'],
          ['3', 'S3', 'Clearly visible with normal corrected vision (> 0.2 mm to 0.5 mm)', 'Normal vision, direct unaided observation'],
          ['4', 'S4', 'Larger than 0.5 mm up to 5 mm', 'Direct dimensional measurement with graduated scale'],
          ['5', 'S5', 'Larger than 5 mm', 'Direct dimensional measurement; macro defect']
        ]
      },
      {
        id: 'table-3',
        title: 'Table 3 — Rating Scheme for Intensity of Uniform Changes (Clause 4.4)',
        description: 'Designates the intensity of uniform appearance changes, such as yellowing, darkening, or loss of gloss.',
        headers: ['Rating', 'Intensity Level', 'Visual Appearance'],
        rows: [
          ['0', 'Unchanged', 'No perceptible change detected'],
          ['1', 'Very slight', 'Just perceptible change under optimal illumination'],
          ['2', 'Slight', 'Clearly perceptible change'],
          ['3', 'Moderate', 'Very clearly perceptible change across the coating plane'],
          ['4', 'Considerable', 'Pronounced and widespread appearance change'],
          ['5', 'Very marked', 'Severe degradation or transformation in appearance']
        ]
      }
    ],
    procedure: [
      {
        step: 1,
        title: 'Surface Lighting & Viewing Setup',
        text: 'Position the test surface under uniform, glare-free illumination conforming to ISO 13076. Ensure viewing distance allows unobstructed inspection.'
      },
      {
        step: 2,
        title: 'Visual Screening',
        text: 'Inspect the surface without optical magnification to detect macro-defects and ascertain general pattern uniformity.'
      },
      {
        step: 3,
        title: 'Quantity & Typical Size Rating',
        text: 'Determine the quantity rating (0 to 5) from Table 1. If defects vary in size, record the size rating (S0 to S5 from Table 2) of the largest defects that are numerous enough to be typical of the area.'
      },
      {
        step: 4,
        title: 'Area Estimation & Result Documentation',
        text: 'Estimate the total affected surface area as an approximate percentage. Compile report in the standard format (e.g., flaking; degree 2(S3), 8 % area).'
      }
    ],
    acceptanceCriteria: {
      hasOfficialCriteria: false,
      summary: 'ISO 4628-1 is a classification and designation system; it does not define universal pass/fail acceptance limits.',
      details: 'Acceptance thresholds depend on the coating specification, service exposure class, and contractual agreement between interested parties. In typical marine protective systems, quantity ratings above 1 or size ratings above S2 generally trigger defect maintenance or re-inspection.'
    }
  },
  {
    id: 'iso-8502-3-2017',
    designation: 'ISO 8502-3:2017',
    standardNumber: 'ISO 8502-3',
    publicationYear: 2017,
    standardCode: 8502,
    partNumber: 3,
    edition: 'Second edition (2017-01-15)',
    displayTitle: 'Assessment of Dust on Steel Surfaces Prepared for Painting (Pressure-Sensitive Tape Method)',
    shortNavTitle: 'Surface Dust Assessment via Tape Method',
    fullOfficialTitle: 'Preparation of steel substrates before application of paints and related products — Tests for the assessment of surface cleanliness — Part 3: Assessment of dust on steel surfaces prepared for painting (pressure-sensitive tape method)',
    summaryDescription: 'Describes a standardized pressure-sensitive tape method for evaluating the quantity rating (0 to 5) and particle size class (Class 0 to 5) of dust remaining on blast-cleaned steel surfaces before painting.',
    type: 'official_iso',
    typeLabel: 'Official ISO Standard',
    scope: 'Describes a qualitative test for evaluating the quantity and particle size of dust remaining on blast-cleaned steel surfaces prepared for painting. Evaluates dust adhering to a standardized pressure-sensitive tape applied under controlled pressure.',
    inspectionCriteria: [
      {
        label: 'Tape Specification',
        detail: 'Must use virtually colourless, transparent pressure-sensitive tape of 25 mm width, with a peel adhesion strength of at least 190 N/m width when tested in accordance with IEC 60454-2 (Clause 5.1).'
      },
      {
        label: 'Application Load',
        detail: 'Standard pressure is applied using a calibrated spring-loaded roller exerting 39.2 N or 49.0 N, or alternatively by firm thumb pressure across the tape strip.'
      },
      {
        label: 'Micro-Dust Discoloration Rule',
        detail: 'Mandatory standard rule: Any uniform reddish-brown or black discoloration observed on the tape must be recorded as Quantity Rating 5, Size Class 1 (Clause 6.6 & 6.7).'
      },
      {
        label: 'Substrate Limitation (Rust Grade D Exclusion)',
        detail: 'The test is valid only for steel surfaces originally corresponding to Rust Grades A, B, or C before cleaning. Surfaces originally Grade D cannot be assessed with tape because the adhesive film cannot conform to deep corrosion pits (Clause 6.2).'
      }
    ],
    tables: [
      {
        id: 'table-dust-quantity',
        title: 'Dust Quantity Ratings (Clause 6.6)',
        description: 'Assessed by visual comparison with Figure 1 pictorial reference standards.',
        headers: ['Rating', 'Quantity Designation', 'Visual Dust Density Description'],
        rows: [
          ['Rating 0', 'None', 'No dust particles visible under 10× magnification'],
          ['Rating 1', 'Very low', 'Particles barely visible; extremely sparse particle distribution'],
          ['Rating 2', 'Low', 'Small particles visible; low overall area coverage'],
          ['Rating 3', 'Moderate', 'Moderate dust quantity; distinctly perceptible particle distribution'],
          ['Rating 4', 'High', 'Heavy dust presence; significant proportion of tape covered'],
          ['Rating 5', 'Very high', 'Dense dust accumulation; high risk of paint adhesion breakdown']
        ]
      },
      {
        id: 'table-dust-size',
        title: 'Dust Particle Size Classes (Clause 6.7)',
        description: 'Particle size classes determined with the aid of a 10× hand lens.',
        headers: ['Class', 'Particle Size Range', 'Visual Observation Threshold'],
        rows: [
          ['Class 0', 'Not visible under 10× magnification', 'Sub-optical / sub-microscopic particulate'],
          ['Class 1', 'Visible under 10× magnification (up to 50 µm)', 'Microscopic dust particles'],
          ['Class 2', '50 µm to 100 µm', 'Just visible with normal corrected vision'],
          ['Class 3', '> 100 µm up to 500 µm (0.1 mm to 0.5 mm)', 'Clearly visible with normal corrected vision'],
          ['Class 4', '> 0.5 mm up to 2.5 mm', 'Readily visible macro-particulate'],
          ['Class 5', '> 2.5 mm', 'Large abrasive flakes or debris particles']
        ]
      }
    ],
    procedure: [
      {
        step: 1,
        title: 'Tape Preparation',
        text: 'Discard the first three turns of tape from the roll. Cut a piece approximately 200 mm long, handling the tape only by its extreme ends to avoid finger grease contamination.'
      },
      {
        step: 2,
        title: 'Application to Steel',
        text: 'Press approximately 150 mm of the tape firmly onto the prepared steel surface at the designated inspection location.'
      },
      {
        step: 3,
        title: 'Pressure Stroke Execution',
        text: 'Move the thumb across the tape maintaining firm downward pressure at steady speed: 3 times in each direction, with each stroke lasting 5 to 6 seconds. Alternatively, pass the calibrated spring-loaded roller once in each direction.'
      },
      {
        step: 4,
        title: 'Peel & Mounting',
        text: 'Peel the tape smoothly from the steel surface and immediately adhere it to a contrasting display board (white or black background) by smoothing with thumb pressure.'
      },
      {
        step: 5,
        title: 'Visual Rating Determination',
        text: 'Compare the mounted tape against the pictorial reference standards to assign the Dust Quantity Rating (0 to 5) and inspect under 10× magnification to classify particle size (Class 0 to 5). Check for overall discoloration (Rating 5, Class 1 rule).'
      }
    ],
    acceptanceCriteria: {
      hasOfficialCriteria: false,
      summary: 'ISO 8502-3 describes the assessment method; acceptance limits must be stated in the project specification.',
      details: 'In marine protective coatings, common contract specifications (such as IMO PSPC for ballast tanks) require dust quantity not exceeding Rating 1 or 2, with particle sizes limited to Class 1 or 2 prior to primer application.'
    }
  },
  {
    id: 'project-coating-defect-framework',
    designation: 'DR-FRAMEWORK-2026',
    standardNumber: 'Project Defect Framework',
    publicationYear: 2026,
    standardCode: 99999,
    partNumber: null,
    edition: 'Version 2.1 (Engineering Deployment)',
    displayTitle: 'Autonomous Marine Coating Defect Evaluation Framework',
    shortNavTitle: 'Defect Specification & Grading Matrix',
    fullOfficialTitle: 'Project Dhatu Rakshana: ISO Coating Defect Evaluation Framework — Standardized Technical Specification & Inspection Matrix',
    summaryDescription: 'Technical matrix mapping defect detections and area coverage thresholds into operational marine coating assessment tiers (PASS, REVIEW, FAIL).',
    type: 'project_framework',
    typeLabel: 'Project Inspection Guidance',
    scope: 'Project-specific technical specification bridging defect detections (bounding boxes, area coverage percentages) with formal marine inspection principles. Distinct from official ISO standards, this framework guides the automated classification of detected defects into operational risk tiers (PASS, REVIEW, FAIL).',
    inspectionCriteria: [
      {
        label: 'Framework Classification',
        detail: 'Project technical framework establishing operational evaluation criteria alongside official international standards for marine coating assessment.'
      },
      {
        label: 'Multi-Modal Evidence',
        detail: 'Defect evaluations correlate visual optical bounding boxes with surface topography depth reconstruction and standards-based threshold boundaries.'
      },
      {
        label: 'Operational Severity Tiers',
        detail: 'Grading outcomes are mapped to three deterministic actions: PASS (normal service condition), REVIEW (localized non-critical anomaly requiring inspection sign-off), and FAIL (barrier breach requiring surface remediation).'
      }
    ],
    tables: [
      {
        id: 'table-defect-matrix',
        title: 'Project Defect Evaluation Matrix',
        description: 'Defect classification, ISO technical reference basis, and operational assessment criteria.',
        headers: ['Defect Classification', 'ISO Reference Basis', 'Operational Criteria & Area Thresholds', 'Physical Significance'],
        rows: [
          [
            'Pinhole / Holiday',
            'ISO 19840 / ISO 4628-1 Table 2',
            'Pass: Area ≤ 0.5 % | Review: 0.5 % to 2.0 % | Fail: Area > 2.0 %',
            'Microscopic pore or discontinuity penetrating through film to steel, creating high galvanic corrosion current.'
          ],
          [
            'Scratch / Mechanical Gouge',
            'ISO 4628-8 Scribe Rules',
            'Pass: Area ≤ 1.0 % | Review: 1.0 % to 4.0 % | Fail: Area > 4.0 %',
            'Linear breach exposing substrate. Evaluated through directional spread and corrosion creep principles.'
          ],
          [
            'Chemical / Salt Contamination',
            'ISO 8501-1 Note 1 / ISO 8502',
            'Pass: Area ≤ 1.5 % | Review: 1.5 % to 5.0 % | Fail: Area > 5.0 %',
            'Residual surface salts or blast debris creating osmotic pressure pockets and premature delamination.'
          ],
          [
            'Active Corrosion & Rust Bloom',
            'ISO 8501-1 Rust Grades A–D',
            'Pass: Area ≤ 0.5 % | Review: 0.5 % to 3.0 % | Fail: Area > 3.0 %',
            'Substrate oxidation beneath or through coating, causing film undercut and localized pitting.'
          ],
          [
            'Blistering & Osmotic Pockets',
            'ISO 4628-2 (Degree 2 to 5)',
            'Pass: Area ≤ 0.8 % | Review: 0.8 % to 3.5 % | Fail: Area > 3.5 %',
            'Liquid-filled or gas-filled domes resulting from osmotic moisture ingress or cathodic disbondment.'
          ],
          [
            'Inclusions & Foreign Matter',
            'ISO 4628-1 (Clause 4.2 / 4.3)',
            'Pass: Area ≤ 1.0 % | Review: 1.0 % to 4.0 % | Fail: Area > 4.0 %',
            'Embedded foreign matter (abrasive grit, dried overspray) creating localized coating micro-porosity.'
          ],
          [
            'Dust Particulate Contamination',
            'ISO 8502-3 Tape Method',
            'Pass: Area ≤ 1.2 % | Review: 1.2 % to 4.5 % | Fail: Area > 4.5 %',
            'Surface dust or micro-dust discoloration (Rating 5, Class 1) preventing direct chemical wetting.'
          ]
        ]
      }
    ],
    procedure: [
      {
        step: 1,
        title: 'Image Capture & Area Segmentation',
        text: 'Acquire high-resolution inspection image of the target coating area with dimensional reference markers.'
      },
      {
        step: 2,
        title: 'Defect Detection & Classification',
        text: 'Execute computer vision models to identify defect bounding boxes, confidence scores, and defect types.'
      },
      {
        step: 3,
        title: 'Cumulative Area Computation',
        text: 'Compute the cumulative affected surface area percentage for each defect class across the inspection region.'
      },
      {
        step: 4,
        title: 'Threshold Matrix Evaluation',
        text: 'Evaluate calculated area percentages against the threshold criteria to assign PASS, REVIEW, or FAIL status.'
      }
    ],
    acceptanceCriteria: {
      hasOfficialCriteria: true,
      summary: 'Deterministic grading logic defined by Project Dhatu Rakshana inspection thresholds:',
      details: 'Overall inspection status is governed by the highest defect severity observed:',
      rules: [
        {
          ruleName: 'PASS Status',
          requirement: 'All defects within Pass thresholds',
          description: 'No defect class exceeds its low-risk area boundary; surface integrity meets naval operational requirements.'
        },
        {
          ruleName: 'REVIEW Status',
          requirement: 'Any defect in Review range; none in Fail',
          description: 'Localized anomaly detected requiring human inspector review and documented maintenance observation.'
        },
        {
          ruleName: 'FAIL Status',
          requirement: 'Any defect exceeding Fail threshold',
          description: 'Severe barrier compromise or active substrate corrosion requiring immediate coating repair or re-blasting.'
        }
      ]
    }
  }
];
