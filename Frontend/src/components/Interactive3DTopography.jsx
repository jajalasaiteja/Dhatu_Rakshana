import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { getAuthToken, getVisitorToken, resolveMediaUrl } from '../api/client';
import { Box, RotateCw, ZoomIn, ZoomOut, Layers, Download, RotateCcw } from 'lucide-react';
import { getSurfaceColor, generateSampleTopographyGeometry } from '../utils/sampleTopography';

export default function Interactive3DTopography({
  imageUrl,
  meshUrl,
  heightScale = 0.35,
  title = "Surface Micro-Topography",
  isSampleModel = false,
  sampleBadgeText = "DEMONSTRATION DATA",
}) {
  const mountRef = useRef(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [stats, setStats] = useState({ vertices: 0, faces: 0 });
  const [loading3D, setLoading3D] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const sceneRef = useRef(null);
  const groupRef = useRef(null);
  const meshRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const autoRotateRef = useRef(autoRotate);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  useEffect(() => {
    if (!mountRef.current) return;
    setLoading3D(true);

    const width = mountRef.current.clientWidth || 600;
    const height = 440;

    // 1. Scene setup with neutral dark charcoal canvas background
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0E0F11);

    // Dedicated authoritative container for the single active topology mesh
    const topologyGroup = new THREE.Group();
    topologyGroup.name = 'topologyGroup';
    scene.add(topologyGroup);
    groupRef.current = topologyGroup;

    const setSingleTopologyMesh = (mesh) => {
      while (topologyGroup.children.length > 0) {
        const oldChild = topologyGroup.children[0];
        topologyGroup.remove(oldChild);
        if (oldChild.geometry) oldChild.geometry.dispose();
        if (oldChild.material) {
          if (Array.isArray(oldChild.material)) oldChild.material.forEach((m) => m.dispose());
          else oldChild.material.dispose();
        }
      }
      topologyGroup.add(mesh);
      meshRef.current = mesh;
    };

    // 2. Camera setup with Z-up topography coordinate convention
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -3.2, 2.6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.style.display = 'block';
    dom.style.cursor = 'grab';

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(dom);

    // 4. OrbitControls initialization - handles left-click orbit, wheel zoom & right-click pan
    const controls = new OrbitControls(camera, dom);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.8;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.9;
    controls.minDistance = 1.2;
    controls.maxDistance = 8.5;
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.target.set(0, 0, 0);

    // Explicit mouse button mappings to avoid interaction conflicts
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Respect reduced-motion preferences
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    controls.autoRotate = prefersReducedMotion ? false : autoRotateRef.current;
    controls.autoRotateSpeed = 1.0;
    controls.saveState();
    controlsRef.current = controls;

    // Cursor styling during interaction
    controls.addEventListener('start', () => {
      dom.style.cursor = 'grabbing';
    });
    controls.addEventListener('end', () => {
      dom.style.cursor = 'grab';
    });

    // Prevent default context menu on right click pan
    const handleContextMenu = (e) => e.preventDefault();
    dom.addEventListener('contextmenu', handleContextMenu);

    // 5. Lighting configuration for photometric micro-relief inspection (neutral, non-glare)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.90);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
    keyLight.position.set(4, -5, 7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xDCE5DE, 0.45); // Soft neutral daylight
    fillLight.position.set(-4, 5, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xA6B890, 0.30); // Subtle Schist rim
    rimLight.position.set(0, 6, -3);
    scene.add(rimLight);

    const startMeshConstruction = async () => {
      // Branch A: Sample Surface Topography Model (Home Page only)
      if (isSampleModel) {
        try {
          const sampleGeometry = generateSampleTopographyGeometry(heightScale);
          const sampleMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.55,
            metalness: 0.12,
            wireframe: wireframe,
            side: THREE.DoubleSide
          });

          const mesh = new THREE.Mesh(sampleGeometry, sampleMaterial);
          setSingleTopologyMesh(mesh);

          setStats({
            vertices: sampleGeometry.attributes.position.count,
            faces: sampleGeometry.index ? Math.floor(sampleGeometry.index.count / 3) : Math.floor(sampleGeometry.attributes.position.count / 3)
          });
          setLoading3D(false);
          setUnavailable(false);
          return;
        } catch (err) {
          console.error('Failed to construct sample surface topography model:', err);
          setLoading3D(false);
          setUnavailable(true);
          return;
        }
      }

      // Branch B: Actual Inspection Workflow - requires authentic mesh artifact
      if (!meshUrl) {
        setLoading3D(false);
        setUnavailable(true);
        return;
      }

      try {
        const token = getAuthToken() || getVisitorToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const targetUrl = resolveMediaUrl(meshUrl);

        const response = await fetch(targetUrl, { headers });
        if (!response.ok) {
          console.warn(`Topology PLY retrieval failed with HTTP ${response.status} from ${targetUrl}`);
          setLoading3D(false);
          setUnavailable(true);
          return;
        }

        const buffer = await response.arrayBuffer();
        const loader = new PLYLoader();
        const plyGeometry = loader.parse(buffer);

        // WebGL does not support 64-bit float attributes (Float64Array).
        // Open3D writes 'property double' for positions and normals,
        // causing PLYLoader to create Float64BufferAttribute instances.
        // Convert all Float64Array attributes to standard Float32BufferAttribute:
        for (const name in plyGeometry.attributes) {
          const attr = plyGeometry.attributes[name];
          if (attr && attr.array instanceof Float64Array) {
            plyGeometry.setAttribute(
              name,
              new THREE.Float32BufferAttribute(new Float32Array(attr.array), attr.itemSize, attr.normalized)
            );
          }
        }

        plyGeometry.computeVertexNormals();

        // Center and scale to standard inspection viewport bounds
        plyGeometry.center();
        plyGeometry.computeBoundingBox();
        const boxSize = new THREE.Vector3();
        plyGeometry.boundingBox.getSize(boxSize);
        const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z) || 1;
        const targetScale = 3.0 / maxDim;
        plyGeometry.scale(targetScale, targetScale, targetScale);

        // Shading material with vertex colors or depth elevation tinting using the 5-color palette
        let plyMaterial;
        if (plyGeometry.hasAttribute('color')) {
          plyMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.60,
            metalness: 0.08,
            wireframe: wireframe,
            side: THREE.DoubleSide
          });
        } else {
          const posAttr = plyGeometry.attributes.position;
          const count = posAttr.count;
          let minZ = Infinity, maxZ = -Infinity;
          for (let i = 0; i < count; i++) {
            const zVal = posAttr.getZ(i);
            if (zVal < minZ) minZ = zVal;
            if (zVal > maxZ) maxZ = zVal;
          }
          const range = (maxZ - minZ) > 0.0001 ? (maxZ - minZ) : 1.0;
          const plyColors = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            const t = (posAttr.getZ(i) - minZ) / range;
            const col = getSurfaceColor(t);
            plyColors[i * 3] = col.r;
            plyColors[i * 3 + 1] = col.g;
            plyColors[i * 3 + 2] = col.b;
          }
          plyGeometry.setAttribute('color', new THREE.BufferAttribute(plyColors, 3));
          plyMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.60,
            metalness: 0.08,
            wireframe: wireframe,
            side: THREE.DoubleSide
          });
        }

        const mesh = new THREE.Mesh(plyGeometry, plyMaterial);
        setSingleTopologyMesh(mesh);

        setStats({
          vertices: plyGeometry.attributes.position.count,
          faces: plyGeometry.index ? Math.floor(plyGeometry.index.count / 3) : Math.floor(plyGeometry.attributes.position.count / 3)
        });
        setLoading3D(false);
        setUnavailable(false);
      } catch (err) {
        console.error('Failed to parse or render 3D surface topography mesh:', err);
        setLoading3D(false);
        setUnavailable(true);
      }
    };

    startMeshConstruction();

    // 7. Animation loop with OrbitControls damping and safe error handling
    let animId;
    let isDisposed = false;
    const animate = () => {
      if (isDisposed) return;
      animId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        try {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        } catch (renderErr) {
          console.error('Three.js render loop error caught safely:', renderErr);
          cancelAnimationFrame(animId);
        }
      }
    };
    animate();

    // 8. Handle container resize with ResizeObserver
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth || 600;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && mountRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(mountRef.current);
    }

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (dom) {
        dom.removeEventListener('contextmenu', handleContextMenu);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
      }
      while (topologyGroup.children.length > 0) {
        const oldChild = topologyGroup.children[0];
        topologyGroup.remove(oldChild);
        if (oldChild.geometry) oldChild.geometry.dispose();
        if (oldChild.material) {
          if (Array.isArray(oldChild.material)) oldChild.material.forEach((m) => m.dispose());
          else oldChild.material.dispose();
        }
      }
      scene.remove(topologyGroup);
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [meshUrl, imageUrl, heightScale, isSampleModel]);

  // Wireframe toggle update
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach((m) => {
          m.wireframe = wireframe;
          m.needsUpdate = true;
        });
      } else {
        meshRef.current.material.wireframe = wireframe;
        meshRef.current.material.needsUpdate = true;
      }
    }
  }, [wireframe]);

  const handleResetView = () => {
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.reset();
      cameraRef.current.position.set(0, -3.2, 2.6);
      cameraRef.current.up.set(0, 0, 1);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleZoom = (direction) => {
    if (controlsRef.current && cameraRef.current) {
      const factor = direction === 'in' ? 0.82 : 1.22;
      const offset = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target);
      offset.multiplyScalar(factor);
      const dist = offset.length();
      if (dist >= controlsRef.current.minDistance && dist <= controlsRef.current.maxDistance) {
        cameraRef.current.position.addVectors(controlsRef.current.target, offset);
        controlsRef.current.update();
      }
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-surface-panel overflow-hidden shadow-technical text-content-primary relative">
      {/* Corner Technical Marks */}
      <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-white/20 pointer-events-none z-20"></div>
      <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-white/20 pointer-events-none z-20"></div>
      <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-white/20 pointer-events-none z-20"></div>
      <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-white/20 pointer-events-none z-20"></div>

      {/* Top Header Strip - Controlled Gray-green / Matte Sage UI accents */}
      <div className="px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-surface-dark/90">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-grayGreen/50 bg-surface-darker flex items-center justify-center text-matteSage shrink-0">
            <Box className="w-3.5 h-3.5 text-matteSage" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-matteSage font-bold">
                {isSampleModel ? 'SAMPLE SURFACE TOPOGRAPHY' : 'Three-Dimensional Surface Analysis'}
              </span>
              <span className="text-[10px] font-mono text-greige/40">|</span>
              <span className="text-[10px] font-mono text-greige">
                {isSampleModel ? 'Specimen Topography Model' : 'Surface Topography'}
              </span>
              {isSampleModel && (
                <span className="demo-data-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-600/40 bg-amber-100/90 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 font-mono text-[9px] uppercase tracking-wider font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse shrink-0" />
                  {sampleBadgeText}
                </span>
              )}
            </div>
            <h3 className="text-xs font-semibold text-fullWhite font-sans">
              {title}
            </h3>
          </div>
        </div>

        {/* Technical Instrument Controls */}
        <div className="flex items-center gap-1.5 text-xs font-mono shrink-0">
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1.5 rounded border nav-transition cursor-pointer flex items-center gap-1 text-[11px] ${
              autoRotate
                ? 'bg-grayGreen border-matteSage text-fullWhite font-semibold'
                : 'bg-surface-dark border-white/10 text-greige hover:border-matteSage hover:text-fullWhite'
            }`}
            title="Toggle Continuous Rotation"
          >
            <RotateCw className="w-3 h-3 text-matteSage" />
            <span className="hidden sm:inline">Rotate</span>
          </button>

          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            className={`px-2.5 py-1.5 rounded border nav-transition cursor-pointer flex items-center gap-1 text-[11px] ${
              wireframe
                ? 'bg-grayGreen border-matteSage text-fullWhite font-semibold'
                : 'bg-surface-dark border-white/10 text-greige hover:border-matteSage hover:text-fullWhite'
            }`}
            title="Toggle Wireframe Tessellation"
          >
            <Layers className="w-3 h-3 text-matteSage" />
            <span className="hidden sm:inline">Wireframe</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          <button
            type="button"
            onClick={() => handleZoom('in')}
            className="p-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage text-greige hover:text-fullWhite nav-transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleZoom('out')}
            className="p-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage text-greige hover:text-fullWhite nav-transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage text-greige hover:text-fullWhite nav-transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Reset View Orientation to Default"
          >
            <RotateCcw className="w-3 h-3 text-matteSage" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport - Dedicated Neutral Dark Cavity */}
      <div className="relative bg-surface-darker select-none pointer-events-auto min-h-[440px]">
        <div
          ref={mountRef}
          className={`w-full h-[440px] select-none touch-none focus:outline-hidden ${unavailable ? 'hidden' : 'block'}`}
          tabIndex={0}
          aria-label="3D Micro-Topography Viewer"
        />

        {loading3D && (
          <div className="absolute inset-0 bg-surface-darker/90 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="text-center space-y-2.5">
              <div className="w-7 h-7 mx-auto border-2 border-matteSage border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-mono font-semibold text-fullWhite tracking-wider uppercase">
                {isSampleModel ? 'Initializing Demonstration Topography' : 'Loading Topography Geometry'}
              </p>
              <p className="text-[11px] font-mono text-greige">
                {isSampleModel ? 'Synthesizing specimen surface profile...' : 'Retrieving authorized surface mesh artifact...'}
              </p>
            </div>
          </div>
        )}

        {unavailable && !loading3D && (
          <div className="absolute inset-0 bg-surface-darker flex flex-col items-center justify-center p-8 text-center z-10">
            <div className="w-12 h-12 rounded-lg border border-white/10 bg-surface-dark flex items-center justify-center text-greige mb-3.5 shadow-panel">
              <Box className="w-6 h-6 text-greige/60" />
            </div>
            <h4 className="text-sm font-mono font-bold text-fullWhite uppercase tracking-wide mb-1.5">
              3D Reconstruction Unavailable
            </h4>
            <p className="text-xs font-mono text-greige max-w-md leading-relaxed">
              Three-dimensional surface micro-topography reconstruction is not available for this inspection record.
            </p>
            <p className="text-[11px] font-mono text-greige/60 mt-2 max-w-md">
              No topology artifact (.ply) is stored for this specimen. Optical inspection imagery and defect classifications remain accessible in the 2D view.
            </p>
          </div>
        )}

        {!unavailable && (
          <>
            {/* Viewport Scale Indicator */}
            <div className="absolute top-3 left-3 bg-surface-darker/90 backdrop-blur-xs px-2.5 py-1.5 rounded border border-white/10 text-[10px] font-mono text-greige pointer-events-none z-10">
              <div>ELEVATION SCALE: <span className="text-matteSage font-semibold">{heightScale.toFixed(2)}x</span></div>
            </div>

            {/* Telemetry Overlay */}
            <div className="absolute top-3 right-3 bg-surface-darker/90 backdrop-blur-xs px-2.5 py-1.5 rounded border border-white/10 text-[10px] font-mono space-x-3 pointer-events-none z-10">
              <span className="text-greige">VERTICES: <strong className="text-fullWhite">{stats.vertices.toLocaleString()}</strong></span>
              <span className="text-greige">FACETS: <strong className="text-fullWhite">{stats.faces.toLocaleString()}</strong></span>
            </div>

            {/* Subtle Visual Indicator for Illustrative Demonstration Specimen */}
            {isSampleModel && (
              <div className="absolute bottom-3 left-3 bg-surface-darker/90 backdrop-blur-xs px-2.5 py-1.5 rounded border border-amber-500/25 text-[10px] font-mono pointer-events-none flex items-center gap-1.5 shadow-panel z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/90 shrink-0" />
                <span className="text-amber-200/90 font-semibold tracking-wide">ILLUSTRATIVE SPECIMEN</span>
                <span className="text-white/20">|</span>
                <span className="text-greige/80">Synthetic Profile</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Continuous 5-Color Photography Palette Elevation Legend */}
      <div className="w-full border-t border-white/10 bg-[#0E0F11] px-4 py-2.5 text-[10px] font-mono select-none">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
          <div className="flex items-center gap-1.5 text-matteSage font-bold uppercase tracking-wider shrink-0">
            <Layers className="w-3 h-3 text-matteSage" />
            <span>Elevation:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#401421] border border-white/20 shrink-0" />
              <span className="text-greige truncate">Deep Cavity</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#B9485A] border border-white/20 shrink-0" />
              <span className="text-greige truncate">Depression</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#CE9770] border border-white/20 shrink-0" />
              <span className="text-fullWhite font-medium truncate">Nominal Coating</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#A6B890] border border-white/20 shrink-0" />
              <span className="text-greige truncate">Upper Relief</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#D0CB93] border border-white/30 shrink-0" />
              <span className="text-matteSage font-semibold truncate">Surface Peak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Instructions & Export Strip */}
      <div className="px-4 py-2 border-t border-white/10 bg-surface-dark/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-greige">
        <div className="flex items-center gap-3">
          <span>Left Drag: Orbit</span>
          <span>•</span>
          <span>Wheel: Zoom</span>
          <span>•</span>
          <span>Right Drag: Pan</span>
        </div>
        {meshUrl && !unavailable && !isSampleModel && (
          <a
            href={resolveMediaUrl(meshUrl)}
            download="surface_topography.ply"
            className="text-matteSage hover:underline font-semibold flex items-center gap-1 nav-transition"
          >
            <Download className="w-3 h-3 text-matteSage" />
            <span>Download Surface Mesh (.PLY)</span>
          </a>
        )}
        {isSampleModel && (
          <div className="text-[10px] text-greige/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-matteSage" />
            <span>Demonstration Topography Model</span>
          </div>
        )}
      </div>
    </div>
  );
}
