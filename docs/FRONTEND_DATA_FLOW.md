# Dhatu Rakshana — Frontend Page-to-Page Data Flow Architecture

This document provides a comprehensive technical reference for the data flow, state transitions, API interactions, and routing across all pages in the **Dhatu Rakshana** (Defense Marine Platform Coating Inspection System) frontend application.

---

## 1. High-Level System Architecture & Navigation Topology

The frontend is a Single Page Application (SPA) powered by **React 18**, **React Router v6**, **Tailwind CSS**, and **Three.js**. Global authentication and session state are managed via `AuthContext`, while network synchronization is handled by the unified API client (`client.js`).

```mermaid
flowchart TD
    Public[Public Visitors] --> HomePage["HomePage ('/')\nOverview & Standards Info"]
    HomePage -->|Log In CTA| Login["Login ('/login')\nCredentials Entry"]
    HomePage -->|Register CTA| Register["Register ('/register')\nNew Inspector Account"]
    
    Login -->|JWT + User Profile| AuthCtx[AuthContext / sessionStorage]
    Register -->|Account Created| Login
    
    AuthCtx -->|Session Authenticated| ProtectedArea{ProtectedRoute Guard}
    
    ProtectedArea --> AppLayout["AppLayout (/dashboard, /upload, /inspections)"]
    
    AppLayout --> Dashboard["Upload / Studio Page ('/dashboard' & '/upload')\n4 Interactive Tabs"]
    AppLayout --> History["History Page ('/inspections')\nAudit Logs & Grid Filter"]
    
    Dashboard -->|Submit Scans Form Data| API_POST["Backend API POST /inspections"]
    API_POST -->|Inspection ID| Result["Result Page ('/inspections/:id')\n2D Defect Overlay & 3D Topography"]
    
    History -->|Click Inspection Card| Result
    Result -->|Back Link| History
    Dashboard -->|Audit Tab 'Full Grid'| History
```

---

## 2. Page & Route Registry

| Route Path | Component | Protection | Primary Purpose | Inbound Data | Outbound Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `HomePage.jsx` | Public | Naval coating standards overview, AMPP/ISO criteria, platform CTAs | `AuthContext` (inspects `user`, `isAuthenticated`) | User navigation to `/login`, `/register`, or `/dashboard` |
| `/login` | `Login.jsx` | Public (redirects if auth) | Inspector login with email and password | User inputs (`email`, `password`) | Dispatches `login()` to `AuthContext`, redirects to `/dashboard` |
| `/register` | `Register.jsx` | Public | Account creation for certified inspectors | User inputs (`full_name`, `email`, `password`) | Dispatches `POST /auth/register`, redirects to `/login` |
| `/dashboard`, `/upload` | `Upload.jsx` | Protected (`ProtectedRoute`) | 4-in-1 Studio: Specimen Ingestion, Real-time 3D, Standards Matrix, Audit Logs | `GET /zones`, `GET /inspections`, User uploaded files / presets | Dispatches `POST /zones`, `POST /inspections`, navigates to `/inspections/:id` |
| `/inspections` | `History.jsx` | Protected (`ProtectedRoute`) | Comprehensive audit log of past scans with search, filter, and sorting | `GET /inspections` | User click navigates to `/inspections/:id` |
| `/inspections/:id` | `Result.jsx` | Protected (`ProtectedRoute`) | Detailed defect bounding boxes, standards grading verdict, 3D micro-topography | Route param `:id`, `GET /inspections/:id`, auto-polling | Downloads `.ply` mesh, switches perspective angles, links back to `/inspections` |
| `*` | `NotFound.jsx` | Public | 404 fallback page | Invalid URL string | Navigation button back to `/` |

---

## 3. Detailed Data Flow by Phase

### Phase 1: Authentication & Session Initialization

```mermaid
sequenceDiagram
    autonumber
    actor Inspector as Defense Inspector
    participant Login as Login.jsx
    participant Auth as AuthContext.jsx
    participant Storage as browser sessionStorage
    participant Client as client.js (API Client)
    participant Backend as FastAPI (/auth/login)

    Inspector->>Login: Enters email and password
    Login->>Auth: login(email, password)
    Auth->>Client: apiClient('/auth/login', { method: 'POST', body: ... })
    Client->>Backend: HTTP POST /auth/login { email, password }
    Backend-->>Client: { access_token, token_type, user: { id, email, full_name, role } }
    Client-->>Auth: Resolves user data & token
    Auth->>Storage: setItem('access_token', token)
    Auth->>Storage: setItem('user', JSON.stringify(user))
    Auth->>Login: Returns authenticated user
    Login->>Inspector: Navigate to /dashboard (Protected)
```

1. **Input Payload**: `email: "inspector@navy.mil"`, `password: "password123"`.
2. **Network Interaction**: `POST http://127.0.0.1:8000/auth/login`.
3. **Session Persistence**:
   - `access_token`: Stored in `sessionStorage` under `'access_token'` and `'dhatu_access_token'`.
   - `user`: Serialized JSON object `{ id: 1, email: "inspector@navy.mil", full_name: "Chief Inspector Sharma", role: "inspector" }`.
4. **Subsequent API Calls**: Every outgoing request through `apiClient()` automatically inspects `sessionStorage` and injects:
   ```http
   Authorization: Bearer dhatu-jwt-token-1-inspector@navy.mil
   ```
5. **Unauthorized Guard**: If backend returns `401 Unauthorized`, `client.js` clears tokens, emits `window.dispatchEvent('auth:unauthorized')`, and `ProtectedRoute` immediately bounces the user to `/login`.

---

### Phase 2: Ingestion Studio (`Upload.jsx`) & Zone Management

`Upload.jsx` serves as the operational heart of the system. It contains four segmented tabs:

```mermaid
flowchart LR
    subgraph Upload_Tabs [Upload.jsx Tabs]
        Tab1["Tab 1: AI Defect Inspection\n(Active Studio)"]
        Tab2["Tab 2: 3D Micro-Topography\n(Real-Time Three.js)"]
        Tab3["Tab 3: Standards Compliance\n(Grading Threshold Matrix)"]
        Tab4["Tab 4: Audit History\n(Quick Inspection Feed)"]
    end
```

#### Step 2.1: Dynamic Defense Platform Zones Loading & Creation
1. **On Mount**: `Upload.jsx` dispatches `GET /zones`.
   - Response: `[ { "id": 1, "name": "Hull Port Waterline - Strake A1", "asset_description": "..." }, ... ]`.
   - State: `zones` array and `selectedZoneId` (defaults to first zone).
2. **Dynamic Zone Registration ("+ Add Platform" Modal)**:
   - User inputs `newZoneName` and `newZoneDesc`.
   - Dispatches `POST /zones` with `{ "name": "...", "asset_description": "..." }`.
   - Backend returns `{ "id": 6, "name": "...", "asset_description": "..." }`.
   - Frontend appends new zone to `zones` state and automatically sets `selectedZoneId = created.id`.

#### Step 2.2: Multi-Specimen File Selection & Staging
Users can upload multiple high-resolution photos representing various camera angles, lighting conditions, or strakes of a naval specimen:
- **State Tracked**:
  - `selectedFiles`: `File[]` — array of raw browser `File` objects.
  - `previewUrls`: `string[]` — array of `URL.createObjectURL(file)`.
  - `activePreviewIdx`: `number` — currently previewed angle (0 to $N-1$).
- **Actions**:
  - `addFiles(incomingFiles)`: Appends new files, generates object URLs, sets active view to the newest addition.
  - `removeFile(index)`: Removes photo at index, re-indexes active view.
  - `loadSyntheticPreset(defectType)`: Generates an in-memory 640x640 HTML5 Canvas defect specimen (`pinhole`, `scratch`, `contamination`, `particulate`), converts to `Blob`/`File`, and stages it.

```mermaid
sequenceDiagram
    autonumber
    actor Inspector as Inspector
    participant Studio as Upload.jsx
    participant Canvas as In-Memory 2D Canvas
    participant Client as client.js
    participant API as FastAPI (/inspections)
    participant ResultPage as Result.jsx (/inspections/:id)

    Inspector->>Studio: Selects multiple files (e.g. 6 angles) OR clicks [Mechanical Scratch]
    opt Synthetic Defect Preset Clicked
        Studio->>Canvas: Render surface noise + scratch valley
        Canvas-->>Studio: canvas.toBlob() -> File('preset_scratch.png')
    end
    Studio->>Studio: Updates selectedFiles[], previewUrls[], activePreviewIdx
    Inspector->>Studio: Clicks "Run Defense Coating Inspection"
    Studio->>Client: apiClient('/inspections', { method: 'POST', body: FormData })
    Note over Client,API: FormData contains: images (multiple), image (first), file (first), zone_id
    Client->>API: HTTP POST /inspections (multipart/form-data)
    Note over API: 1. StorageAdapter saves files<br/>2. Open3D generates composite .ply mesh<br/>3. Computer Vision detects defects<br/>4. Grading Engine determines verdicts<br/>5. Database inserts Inspection & Detections
    API-->>Client: { inspection_id: 8, overall_verdict: "FAIL", image_count: 6, status: "COMPLETED" }
    Client-->>Studio: Resolves response object
    Studio->>ResultPage: navigate('/inspections/' + inspection_id)
```

---

### Phase 3: Interactive 3D Micro-Topography (`Interactive3DTopography.jsx`)

Both `Upload.jsx` (Tab 2) and `Result.jsx` utilize the Three.js 3D Micro-Topography Viewer:

1. **Inputs**:
   - `imageUrl`: Preview URL of the active specimen photo.
   - `meshUrl`: Optional URL to the binary Open3D `.ply` mesh (`/files/meshes/...`).
   - `heightScale`: Vertical exaggeration multiplier (default: `0.35`).
2. **Three.js Pipeline**:
   - Initializes `PerspectiveCamera`, `WebGLRenderer`, `AmbientLight`, and two directional key/fill lights.
   - Generates a $128 \times 128$ segmented `PlaneGeometry`.
   - Samples image grayscale luminance:
     $$\text{lum} = 0.299 \cdot R + 0.587 \cdot G + 0.114 \cdot B$$
     $$Z_{\text{depth}} = (1.0 - \text{lum}) \cdot \text{heightScale}$$
   - Assigns a thermal defense elevation vertex colormap:
     - $Z < 0.25$: Deep Ocean Blue
     - $0.25 \le Z < 0.60$: Emerald Coating Surface
     - $Z \ge 0.60$: Bronze / Warning Corrosion Peak
   - Computes vertex normals and renders via `MeshStandardMaterial`.
3. **Interactive Controls**:
   - Custom mouse orbit dragging (`rotation.x`, `rotation.z`).
   - Mouse wheel zoom (`camera.position.z`).
   - Toggles: Auto-rotate, Wireframe mode, Reset camera view.

---

### Phase 4: Results, Defect Overlay & Standards Grading (`Result.jsx`)

When navigated to `/inspections/:id`, `Result.jsx` retrieves the complete inspection payload:

```mermaid
sequenceDiagram
    autonumber
    participant ResultPage as Result.jsx
    participant Client as client.js
    participant API as FastAPI (/inspections/:id)
    participant Overlay as BoundingBoxOverlay.jsx
    participant Three as Interactive3DTopography.jsx

    ResultPage->>Client: apiClient('/inspections/' + id)
    Client->>API: HTTP GET /inspections/:id
    API-->>Client: Inspection Detail Record
    Client-->>ResultPage: { id, zone, overall_verdict, image_url, image_urls, mesh_url, detections, graded_results }
    
    alt Status is PENDING
        loop Polling Contract
            ResultPage->>ResultPage: pollTimerRef fires every 3 seconds (max 40 tries)
            ResultPage->>Client: apiClient('/inspections/' + id)
        end
    end

    ResultPage->>ResultPage: Extracts image_urls[] -> Multi-perspective strip
    ResultPage->>Overlay: Passes currentImageUrl, detections[], hoveredDetId
    ResultPage->>ResultPage: Renders Standards Compliance Table

    actor Inspector as Inspector
    Inspector->>ResultPage: Hovers detection row in table
    ResultPage->>Overlay: setHoveredDetId(det.id) -> SVG box pulses with amber highlight
    Inspector->>ResultPage: Clicks "Switch to 3D Topography"
    ResultPage->>Three: Mounts Interactive3DTopography with mesh_url & currentImageUrl
    Inspector->>ResultPage: Clicks "Download 3D Mesh (.ply)"
    ResultPage->>API: Direct download of binary surface_mesh.ply
```

#### Detailed Payload Contract (`GET /inspections/:id`)

```json
{
  "id": 8,
  "timestamp": "2026-10-02T10:49:34.000Z",
  "zone_id": 1,
  "zone": {
    "id": 1,
    "name": "Hull Port Waterline - Strake A1",
    "asset_description": "Waterline anti-fouling primer & barrier coating subject to splash-zone cavitation"
  },
  "overall_verdict": "FAIL",
  "image_url": "/files/images/2026/10/02/uuid_img1.jpg",
  "thumbnail_url": "/files/images/2026/10/02/uuid_img1.jpg",
  "image_urls": [
    "/files/images/2026/10/02/uuid_img1.jpg",
    "/files/images/2026/10/02/uuid_img2.jpg"
  ],
  "mesh_url": "/files/meshes/2026/10/02/uuid_surface_mesh.ply",
  "detections": [
    {
      "id": 14,
      "class": "defect",
      "subtype": "contamination",
      "bbox": [120.0, 180.0, 310.0, 340.0],
      "confidence": 0.942,
      "graded_records": [
        {
          "id": 14,
          "detection_id": 14,
          "standard_reference": "ISO 8501-1 / SSPC-SP 10",
          "severity": "CRITICAL",
          "pass_fail": "FAIL"
        }
      ]
    }
  ],
  "graded_results": [
    {
      "id": 14,
      "detection_id": 14,
      "standard_reference": "ISO 8501-1 / SSPC-SP 10",
      "severity": "CRITICAL",
      "pass_fail": "FAIL"
    }
  ]
}
```

---

### Phase 5: Historical Scans & Audit Grid (`History.jsx`)

`History.jsx` displays historical records and logs:

```mermaid
flowchart TD
    Mount[Component Mounts] --> Fetch[apiClient '/inspections']
    Fetch --> Server[GET /inspections]
    Server --> Response[Array of Inspection Summaries]
    
    Response --> Sort[Sort by Timestamp Descending]
    Sort --> RawState["State: inspections[]"]
    
    RawState --> Filter{"Client-side Filter"}
    Filter -->|Search input| FilterZone["matches zone_name keyword"]
    Filter -->|Verdict select| FilterVerdict["matches ALL, PASS, REVIEW, FAIL"]
    
    FilterZone & FilterVerdict --> FilteredList["Derived: filtered[]"]
    
    FilteredList --> RenderGrid[Render Card Grid with Thumbnails, Badges & Dates]
    
    RenderGrid -->|Click Card| NavDetail["navigate('/inspections/' + insp.id)"]
    RenderGrid -->|Click '+ New Inspection'| NavUpload["navigate('/dashboard')"]
```

---

## 4. Cross-Page State Matrix

| State Entity | Scope / Holder | Lifetime | Consumers | Propagation Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **`access_token`** | `AuthContext` + `sessionStorage` | Session | `client.js`, `ProtectedRoute`, `Navbar` | Injected into HTTP headers (`Authorization: Bearer ...`) |
| **`user`** (Profile) | `AuthContext` + `sessionStorage` | Session | `AppLayout`, `HomePage`, `Navbar` | React Context hook `useAuth()` |
| **`zones`** | `Upload.jsx` | Page mount | Zone Selector, Zone Modal | Local `useState`, refreshed on `POST /zones` |
| **`selectedZoneId`** | `Upload.jsx` | Page mount | Zone Selector, Inspection Submission | Appended to `FormData` on `POST /inspections` |
| **`selectedFiles[]`** | `Upload.jsx` | User staging | Dropzone, Thumbnail Strip, Presets | Appended to `FormData` (`images`) |
| **`activePreviewIdx`** | `Upload.jsx` | User selection | Main Image Preview, 3D Tab | Local `useState` |
| **`inspection_id`** | React Router | Route transition | `Result.jsx` | URL path parameter (`useParams().id`) |
| **`activeImageIdx`** | `Result.jsx` | Page mount | Multi-perspective Thumbnail strip, `BoundingBoxOverlay`, 3D Viewer | Local `useState` |
| **`hoveredDetId`** | `Result.jsx` | User hover | `BoundingBoxOverlay`, Verdict Table | Bidirectional hover synchronization |

---

## 5. Network Resiliency & Error Recovery

1. **IPv4 / IPv6 Windows Loopback Normalization**:
   - `client.js` normalizes `localhost` to `127.0.0.1` before invoking `fetch()`, preventing Windows IPv6 `[::1]` connection refused errors.
2. **Automatic 401 Session Interception**:
   - If a token expires or is invalidated, `client.js` intercepts HTTP 401, invokes `clearAuthToken()`, and fires `window.dispatchEvent('auth:unauthorized')`. `ProtectedRoute` seamlessly captures this and navigates to `/login`.
3. **Pending Analysis Polling Contract**:
   - If an asynchronous inference job is still marked `"pending"`, `Result.jsx` enters a 3-second recurring polling loop up to 40 iterations.
4. **Error Panel with Instant Retry**:
   - Both `Upload.jsx` and `Result.jsx` embed `ErrorPanel.jsx` with an explicit `onRetry` handler that re-executes the failed fetch without needing a full browser reload.
