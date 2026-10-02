export const ZONES = [
  {
    id: 1,
    name: "Hull Port Waterline - Strake A1",
    shortName: "Hull section 4",
    asset_description: "Waterline anti-fouling primer & barrier coating subject to splash-zone cavitation & biological fouling",
    environment: "Submerged Splash Zone",
    risk_level: "CRITICAL",
    primary_standard: "ISO 8501-1 / SSPC-SP 10",
  },
  {
    id: 2,
    name: "Flight Deck & Traffic Plating 2",
    shortName: "Deck plate 2",
    asset_description: "Heavy-duty non-skid marine topcoat exposed to high-impact wheel load & cyclic salt spray",
    environment: "Atmospheric Heavy Wear",
    risk_level: "HIGH",
    primary_standard: "SSPC-PA 2 / SSPC-VIS 2",
  },
  {
    id: 3,
    name: "Confined Ballast Tank Void 1",
    shortName: "Ballast tank 1",
    asset_description: "Confined compartment epoxy barrier protecting internal steel framing against corrosive salt ballast",
    environment: "Immersion & Anoxic",
    risk_level: "CRITICAL",
    primary_standard: "NACE SP0188 / ISO 4628",
  },
  {
    id: 4,
    name: "Forward Superstructure Mast 1",
    shortName: "Superstructure 1",
    asset_description: "High-shear superstructure hydrodynamic flow surface with polyurethane weatherable finish",
    environment: "Atmospheric UV / Wind Shear",
    risk_level: "MEDIUM",
    primary_standard: "ISO 4628 Blistering / Rust",
  },
];

export const DEFECT_STANDARDS_REFERENCE = [
  {
    code: "ISO 8501-1",
    title: "Rust Grade & Preparation Grade Assessment",
    scope: "Visual assessment of rust grades A, B, C, D and blast cleaning standards Sa 1 to Sa 3.",
    threshold: "Grade Ri 0 (no rust) to Ri 1 allowable in critical marine service zones.",
  },
  {
    code: "SSPC-PA 2",
    title: "Measurement of Dry Coating Thickness with Magnetic Gages",
    scope: "Verification of dry film thickness (DFT) compliance across 5 spot measurements per 100 sq ft.",
    threshold: "Spot thickness within 80% to 120% of specified nominal dry film thickness (DFT).",
  },
  {
    code: "NACE SP0188",
    title: "Discontinuity (Holiday) Testing of Protective Coatings",
    scope: "Low and high-voltage spark testing detecting pinholes and microscopic coating holidays.",
    threshold: "Zero allowable dielectric pinholes on continuous barrier layers.",
  },
  {
    code: "ISO 4628-2",
    title: "Evaluation of Degradation of Coatings — Blistering",
    scope: "Quantification of blistering density (quantity 2 to 5) and blister bubble size (S2 to S5).",
    threshold: "Density > 2 or Size > S2 constitutes immediate coating failure.",
  },
  {
    code: "SSPC-VIS 2",
    title: "Standard Method of Evaluating Degree of Rusting on Painted Steel",
    scope: "Comparative photographic scale evaluating general, spot, and pinpoint rust distributions.",
    threshold: "Rust percentage < 0.1% for Grade 9-G pass threshold.",
  },
];
