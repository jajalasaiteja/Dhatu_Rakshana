# Dhatu Rakshana — Frontend Web Dashboard

Modern, responsive defense maritime coating inspection web interface built with **React 19**, **Tailwind CSS**, and **Three.js**.

---

## 1. Technical Stack

- **Framework:** React 19.0.0 & React Router DOM 7.1.0
- **Build Tool:** Vite 8.3.5
- **Styling:** Tailwind CSS 3.4.17 (Custom dark defense color system)
- **3D Surface Visualization:** Three.js 0.186.1 (`OrbitControls`, `PLYLoader`)
- **Analytics & Charts:** Recharts 2.15.1
- **Icons:** Lucide React

---

## 2. Key Pages & Workflows

1. **Defense Portal Landing (`/`):**
   * Overview of platform capabilities, naval zone integrity metrics, and maritime standards certification.
2. **Inspector Authentication (`/login`, `/register`):**
   * Secure JWT authentication with role-based dashboard access.
3. **Specimen Upload Dashboard (`/upload`):**
   * Drag-and-drop batch upload for multiple high-resolution specimen photos.
   * Zone selection (e.g., Hull Port Waterline, Keel Plating) and AI model sensitivity controls.
4. **Interactive Analysis Results (`/inspections/:id`):**
   * **Multi-Angle Thumbnail Carousel:** Switch between multiple specimen angles with defect bounding boxes automatically filtered per image.
   * **Bounding Box Defect Localization:** Precise percentage-scaled bounding boxes (`BoundingBoxOverlay.jsx`) immune to browser resizing or letterboxing.
   * **3D Surface Micro-Topography Viewer:** Interactive 3D rendering of Open3D surface meshes with depth contour gradients and orbital camera rotation.
   * **Quantitative Measurements Table:** Defect aspect ratio, equivalent diameter, and area percentage.
   * **ISO 4628 / SSPC-PA 2 Compliance Panel:** Standardized density ratings and automated `PASS`/`REVIEW`/`FAIL` engineering verdicts.
   * **Audit PDF Download:** One-click download of authoritative engineering audit reports.
5. **Inspection History Log (`/inspections`, `/history`):**
   * Filterable, sortable historical record of all vessel scans with verdicts and date filters.
6. **Visitor Access Portal (`/visitor-access`, `/visitor/records`):**
   * Dedicated read-only mode for external auditors and shipwright reviewers.

---

## 3. Development & Build

### Development Server (with hot reload)
```bash
npm run dev
```
Starts development server on `http://localhost:5173/`.

### Production Build
```bash
npm run build
```
Compiles and bundles the production single-page application into `dist/` ready to be served by FastAPI or Nginx.
