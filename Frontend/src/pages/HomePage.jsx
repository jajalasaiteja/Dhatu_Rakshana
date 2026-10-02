import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFECT_STANDARDS_REFERENCE } from '../config/zones';
import Interactive3DTopography from '../components/Interactive3DTopography';
import {
  Shield,
  Box,
  Cpu,
  FileCheck2,
  ArrowRight,
  ChevronRight,
  Layers,
  History as HistoryIcon,
  Search
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-content-primary font-sans selection:bg-grayGreen/50 selection:text-white">
      
      {/* Public Technical Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#18191C] border-b border-white/10 shadow-panel">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-15 flex items-center justify-between">
          
          {/* Brand Header */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-hidden"
            title="Dhatu Rakshana — Marine Coating Inspection & Surface Integrity Analysis"
          >
            <div className="w-8 h-8 rounded border border-grayGreen/50 bg-[#121315] flex items-center justify-center text-matteSage group-hover:border-matteSage nav-transition">
              <Shield className="w-4 h-4 text-matteSage" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 leading-none">
                <span className="text-base font-bold text-fullWhite tracking-tight font-sans">
                  DHATU RAKSHANA
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-wider uppercase text-greige mt-0.5">
                Marine Coating Inspection & Surface Integrity Analysis
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-greige">
            <a href="#capabilities" className="hover:text-fullWhite nav-transition">
              Inspection Capabilities
            </a>
            <a href="#workflow" className="hover:text-fullWhite nav-transition">
              Analysis Workflow
            </a>
            <a href="#standards" className="hover:text-fullWhite nav-transition">
              Standards Reference
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 font-mono text-xs">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/inspections"
                  className="px-3.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage text-fullWhite nav-transition"
                >
                  Analysis History
                </Link>
                <Link
                  to="/dashboard"
                  className="px-4 py-1.5 rounded border border-grayGreen/80 bg-grayGreen hover:bg-grayGreen-light text-fullWhite font-semibold shadow-technical nav-transition flex items-center gap-1.5"
                >
                  <span>New Inspection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:bg-surface-panel text-fullWhite nav-transition"
                >
                  Inspector Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex px-3.5 py-1.5 rounded border border-grayGreen/80 bg-grayGreen hover:bg-grayGreen-light text-fullWhite font-semibold nav-transition shadow-technical"
                >
                  Register
                </Link>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1">
        
        {/* Technical Inspection Platform Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-20 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 border-b border-white/10">
          
          {/* Subtle Grid Pattern Background */}
          <div className="absolute inset-0 bg-inspection-grid opacity-30 pointer-events-none -z-10" />

          {/* Two-Column Composition on Modern Desktop Displays */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Project Identity, Title, Detailed Explanations & Actions */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Platform Identity & Standards Indicators */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-grayGreen/40 bg-surface-panel shadow-panel">
                  <span className="w-2 h-2 rounded-xs bg-matteSage"></span>
                  <span className="text-fullWhite font-medium">Marine Coating Inspection Platform</span>
                  <span className="text-white/20">|</span>
                  <span className="text-greige">AMPP • ISO 4628 • SSPC-PA 2</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/10 bg-surface-dark text-[11px] text-greige">
                  <FileCheck2 className="w-3.5 h-3.5 text-matteSage" />
                  <span>Standards-Based Surface Analysis</span>
                </div>
              </div>

              {/* Headings Hierarchy */}
              <div className="space-y-2">
                <div className="text-xs sm:text-sm font-mono font-bold tracking-widest text-matteSage uppercase">
                  DHATU RAKSHANA
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-fullWhite tracking-tight leading-tight">
                  Marine Coating Inspection & Surface Integrity Analysis
                </h1>
              </div>

              {/* Detailed Substantive Introductory Description */}
              <p className="text-sm sm:text-base text-fullWhite/95 leading-relaxed font-sans">
                Dhatu Rakshana is a marine coating inspection and surface analysis platform designed to support the examination of coating condition through inspection imagery, defect identification, surface characterization, three-dimensional topography analysis, and standards-based assessment.
              </p>

              {/* Detailed Operational Context & Problem Statement */}
              <div className="p-4 rounded border border-grayGreen/30 border-l-4 border-l-grayGreen bg-surface-panel/90 shadow-panel space-y-2 text-xs text-greige leading-relaxed font-sans">
                <h2 className="text-xs font-mono font-bold text-matteSage uppercase tracking-wide flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-matteSage" />
                  <span>Objective Coating Evaluation in Demanding Marine Environments</span>
                </h2>
                <p className="text-greige">
                  Protective coatings on naval and commercial vessels provide the first line of defense against saltwater immersion, cavitation, biofouling, and mechanical abrasion. Undetected micro-cracking, blistering, and holidays break the protective barrier, accelerating substrate corrosion and leading to costly structural downtime. Dhatu Rakshana eliminates subjective inspection variability by linking high-resolution optical evidence with spatial 3D elevation reconstruction and deterministic evaluation criteria from ISO and SSPC standards.
                </p>
              </div>

              {/* Action Row */}
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs pt-1">
                <Link
                  to={isAuthenticated ? "/dashboard" : "/login"}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite font-semibold shadow-technical nav-transition cursor-pointer"
                >
                  <span>Start New Inspection</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </Link>

                <Link
                  to={isAuthenticated ? "/inspections" : "/login"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-white/15 bg-surface-panel hover:bg-surface-elevated text-fullWhite nav-transition cursor-pointer"
                >
                  <HistoryIcon className="w-3.5 h-3.5 text-matteSage" />
                  <span>View Analysis History</span>
                </Link>

                <a
                  href="#standards"
                  className="px-5 py-2.5 rounded border border-white/10 bg-surface-dark hover:bg-surface-panel text-greige hover:text-fullWhite nav-transition"
                >
                  Review Reference Standards
                </a>
              </div>

              {/* Technical Inspection Evidence Summary Strip */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono text-greige py-2.5 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-matteSage" />
                  <span className="text-fullWhite font-semibold">Evidence Types:</span>
                  <span className="text-greige">Optical Imagery & 3D Surface Topography</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-grayGreen" />
                  <span className="text-fullWhite font-semibold">Evaluation:</span>
                  <span className="text-greige">ISO 4628 • SSPC-PA 2 • NACE SP0188</span>
                </div>
              </div>

            </div>

            {/* Right Column: Live Interactive Surface Topography & Structured Technical Overview */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Interactive 3D Surface Micro-Topography Viewer Component */}
              <div className="shadow-technical rounded-lg overflow-hidden border border-white/15 bg-surface-panel">
                <div className="px-3.5 py-2 border-b border-white/10 bg-surface-dark/90 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-matteSage" />
                    <span className="font-semibold text-fullWhite text-[11px]">
                      Interactive Surface Topography Visualization
                    </span>
                  </div>
                  <span className="text-[10px] text-greige">
                    Left Drag: Rotate • Wheel: Zoom
                  </span>
                </div>

                <Interactive3DTopography
                  imageUrl=""
                  heightScale={0.35}
                  title="Specimen Topography Model"
                />
              </div>

              {/* Analytical Modalities Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded border border-white/10 bg-surface-panel shadow-panel">
                  <div className="text-[10px] font-bold text-matteSage uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-matteSage" />
                    <span>Visual Photometry</span>
                  </div>
                  <p className="text-[11px] text-greige font-sans leading-relaxed">
                    Identifies visible coating anomalies, bounding box coordinates, and morphology characteristics across hull zones.
                  </p>
                </div>

                <div className="p-3 rounded border border-white/10 bg-surface-panel shadow-panel">
                  <div className="text-[10px] font-bold text-matteSage uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-matteSage" />
                    <span>Spatial Topography</span>
                  </div>
                  <p className="text-[11px] text-greige font-sans leading-relaxed">
                    Reconstructs surface micro-relief, cavity depth, and elevation contours to evaluate localized pitting and blistering.
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Section: 5 Core Platform Inspection Capabilities */}
          <div id="capabilities" className="mt-14 pt-10 border-t border-white/10">
            <div className="mb-6 max-w-3xl">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-matteSage">
                PLATFORM CAPABILITIES
              </div>
              <h2 className="text-xl sm:text-2xl font-mono font-bold text-fullWhite mt-1">
                Inspection Capabilities & Analytical Methods
              </h2>
              <p className="text-xs text-greige mt-1 font-medium leading-relaxed font-sans">
                Dhatu Rakshana provides structured tools designed to examine coating integrity across every stage of the marine inspection lifecycle.
              </p>
            </div>

            {/* 5-Capability Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 text-left font-mono">
              
              {/* Capability 1: Inspection and Image Analysis */}
              <div className="p-4 rounded border border-white/10 hover:border-matteSage/60 bg-surface-panel shadow-panel relative group nav-transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-matteSage">
                      IMAGERY
                    </span>
                    <Box className="w-3.5 h-3.5 text-greige" />
                  </div>
                  <h3 className="text-xs font-semibold text-fullWhite font-sans">
                    Inspection and Image Analysis
                  </h3>
                  <p className="text-[11px] text-greige mt-2 font-sans leading-relaxed">
                    Inspection imagery provides the primary evidence used to examine visible coating condition and identify areas requiring further assessment. High-resolution captures across vessel strakes and compartments allow localized surface variations to be recorded and cataloged.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-grayGreen-light font-mono">
                  Primary Visual Evidence
                </div>
              </div>

              {/* Capability 2: Defect Identification and Assessment */}
              <div className="p-4 rounded border border-white/10 hover:border-matteSage/60 bg-surface-panel shadow-panel relative group nav-transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-matteSage">
                      DEFECTS
                    </span>
                    <Cpu className="w-3.5 h-3.5 text-greige" />
                  </div>
                  <h3 className="text-xs font-semibold text-fullWhite font-sans">
                    Defect Identification and Assessment
                  </h3>
                  <p className="text-[11px] text-greige mt-2 font-sans leading-relaxed">
                    Detected coating anomalies can be examined according to their visible characteristics and relevant assessment criteria. Defect classifications distinguish localized failures such as blistering, scratches, micro-cracks, and particulate contamination.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-grayGreen-light font-mono">
                  Morphology & Severity Classification
                </div>
              </div>

              {/* Capability 3: Three-Dimensional Surface Analysis */}
              <div className="p-4 rounded border border-white/10 hover:border-matteSage/60 bg-surface-panel shadow-panel relative group nav-transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-matteSage">
                      3D SURFACE
                    </span>
                    <Layers className="w-3.5 h-3.5 text-greige" />
                  </div>
                  <h3 className="text-xs font-semibold text-fullWhite font-sans">
                    Three-Dimensional Surface Analysis
                  </h3>
                  <p className="text-[11px] text-greige mt-2 font-sans leading-relaxed">
                    The interactive surface representation provides another view of local surface variation and allows the inspected area to be examined spatially. Reconstructing micro-elevation profiles reveals cavity depths, surface roughness, and blistering geometry.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-grayGreen-light font-mono">
                  Interactive Spatial Representation
                </div>
              </div>

              {/* Capability 4: Standards and Assessment References */}
              <div className="p-4 rounded border border-white/10 hover:border-matteSage/60 bg-surface-panel shadow-panel relative group nav-transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-matteSage">
                      STANDARDS
                    </span>
                    <FileCheck2 className="w-3.5 h-3.5 text-greige" />
                  </div>
                  <h3 className="text-xs font-semibold text-fullWhite font-sans">
                    Standards and Assessment References
                  </h3>
                  <p className="text-[11px] text-greige mt-2 font-sans leading-relaxed">
                    Applicable standards and reference criteria are presented alongside the analysis to provide context for inspection findings. Objective threshold criteria from ISO 4628, SSPC-PA 2, and NACE SP0188 inform compliance verdicts.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-grayGreen-light font-mono">
                  Deterministic Compliance Grading
                </div>
              </div>

              {/* Capability 5: Inspection History */}
              <div className="p-4 rounded border border-white/10 hover:border-matteSage/60 bg-surface-panel shadow-panel relative group nav-transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-matteSage">
                      ARCHIVE
                    </span>
                    <HistoryIcon className="w-3.5 h-3.5 text-greige" />
                  </div>
                  <h3 className="text-xs font-semibold text-fullWhite font-sans">
                    Inspection History
                  </h3>
                  <p className="text-[11px] text-greige mt-2 font-sans leading-relaxed">
                    Completed analyses can be retained and reviewed so previous inspection results can be accessed without repeating the analysis. Inspectors can track historical condition across assets, audit past findings, and retrieve technical reports.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-grayGreen-light font-mono">
                  Longitudinal Asset Records
                </div>
              </div>

            </div>
          </div>

        </section>

        {/* Inspection Analysis Workflow Section */}
        <section id="workflow" className="py-14 bg-surface-panel border-b border-white/10">
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            
            <div className="max-w-3xl mb-8">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-matteSage">
                INSPECTION ANALYSIS WORKFLOW
              </div>
              <h2 className="text-xl sm:text-2xl font-mono font-bold text-fullWhite mt-1">
                From Image Ingestion to Verified Assessment Record
              </h2>
              <p className="text-xs text-greige mt-1 font-medium leading-relaxed font-sans">
                Inspection imagery is analyzed to identify visible coating anomalies, evaluate surface topography, and establish the visual evidence used for deterministic standards assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
              
              <div className="p-4 rounded border border-white/10 bg-surface-dark shadow-panel relative space-y-2">
                <div className="w-7 h-7 rounded border border-grayGreen/50 bg-surface-panel text-matteSage font-bold flex items-center justify-center text-xs mb-3">
                  01
                </div>
                <h3 className="text-xs font-semibold text-fullWhite tracking-wide">
                  Image Ingestion & Platform Zone
                </h3>
                <p className="text-[11px] text-greige font-sans leading-relaxed">
                  Select vessel compartment or hull section, and stage optical inspection imagery used as the primary inspection evidence.
                </p>
              </div>

              <div className="p-4 rounded border border-white/10 bg-surface-dark shadow-panel relative space-y-2">
                <div className="w-7 h-7 rounded border border-grayGreen/50 bg-surface-panel text-matteSage font-bold flex items-center justify-center text-xs mb-3">
                  02
                </div>
                <h3 className="text-xs font-semibold text-fullWhite tracking-wide">
                  Surface Topography Analysis
                </h3>
                <p className="text-[11px] text-greige font-sans leading-relaxed">
                  Reconstruct surface micro-elevation profiles, estimating surface normals, cavity depths, and generating 3D surface geometry.
                </p>
              </div>

              <div className="p-4 rounded border border-white/10 bg-surface-dark shadow-panel relative space-y-2">
                <div className="w-7 h-7 rounded border border-grayGreen/50 bg-surface-panel text-matteSage font-bold flex items-center justify-center text-xs mb-3">
                  03
                </div>
                <h3 className="text-xs font-semibold text-fullWhite tracking-wide">
                  Defect Identification & Classification
                </h3>
                <p className="text-[11px] text-greige font-sans leading-relaxed">
                  Identify visible coating anomalies, bounding coordinates, morphology classifications, and confidence metrics.
                </p>
              </div>

              <div className="p-4 rounded border border-white/10 bg-surface-dark shadow-panel relative space-y-2">
                <div className="w-7 h-7 rounded border border-grayGreen/50 bg-surface-panel text-matteSage font-bold flex items-center justify-center text-xs mb-3">
                  04
                </div>
                <h3 className="text-xs font-semibold text-fullWhite tracking-wide">
                  Standards Assessment & Reporting
                </h3>
                <p className="text-[11px] text-greige font-sans leading-relaxed">
                  Deterministic grading against ISO 4628 and SSPC-PA 2 criteria with downloadable certified inspection records.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* Standards and Assessment References Section */}
        <section id="standards" className="py-14 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
            <div className="max-w-3xl">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-matteSage">
                STANDARDS AND ASSESSMENT REFERENCES
              </div>
              <h2 className="text-xl sm:text-2xl font-mono font-bold text-fullWhite mt-1">
                Applied Marine Coating Inspection Standards
              </h2>
              <p className="text-xs text-greige mt-1 font-medium leading-relaxed font-sans">
                Review the inspection standards and reference criteria associated with coating condition assessment and defect classification.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-matteSage hover:text-fullWhite nav-transition shrink-0"
            >
              <span>Start New Inspection</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Structured Data Table Making Full Use of Width */}
          <div className="bg-surface-panel rounded border border-white/10 overflow-hidden shadow-technical">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-dark border-b border-white/10 text-greige font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">Standard Code</th>
                    <th className="py-3 px-4 font-semibold">Title / Designation</th>
                    <th className="py-3 px-4 font-semibold">Inspection Scope</th>
                    <th className="py-3 px-4 font-semibold">Assessment Compliance Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {DEFECT_STANDARDS_REFERENCE.map((std, idx) => (
                    <tr key={std.code} className={idx % 2 === 0 ? 'bg-surface-panel' : 'bg-surface-dark/50'}>
                      <td className="py-3.5 px-4 font-bold text-fullWhite whitespace-nowrap">
                        {std.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-fullWhite">
                        {std.title}
                      </td>
                      <td className="py-3.5 px-4 text-greige font-sans text-xs">
                        {std.scope}
                      </td>
                      <td className="py-3.5 px-4 text-fullWhite">
                        <span className="inline-block px-2.5 py-0.5 rounded border border-grayGreen/30 bg-surface-dark text-matteSage font-mono text-[10px]">
                          {std.threshold}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="bg-surface-panel border-t border-white/10 py-6 text-xs font-mono">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded border border-grayGreen/50 bg-[#121315] flex items-center justify-center text-matteSage">
              <Shield className="w-3.5 h-3.5 text-matteSage" />
            </div>
            <div>
              <span className="font-bold text-fullWhite text-xs">DHATU RAKSHANA</span>
              <span className="text-greige text-[11px] ml-2 font-sans">
                Marine Coating Inspection & Surface Integrity Analysis Platform
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-greige text-xs">
            <Link to="/login" className="hover:text-fullWhite nav-transition">Inspector Portal</Link>
            <Link to="/inspections" className="hover:text-fullWhite nav-transition">Analysis History</Link>
            <a href="#standards" className="hover:text-fullWhite nav-transition">Standards Criteria</a>
            <span className="text-matteSage">ISO 4628 • SSPC-PA 2 COMPLIANT</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
