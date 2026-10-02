import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { getAuthToken } from '../api/client';
import { Box, RotateCw, ZoomIn, ZoomOut, Layers, Download, RotateCcw } from 'lucide-react';

export default function Interactive3DTopography({
  imageUrl,
  meshUrl,
  heightScale = 0.35,
  title = "Surface Micro-Topography"
}) {
  const mountRef = useRef(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [stats, setStats] = useState({ vertices: 16384, faces: 32258 });
  const [loading3D, setLoading3D] = useState(true);

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
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 1.4;
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      dom.style.cursor = 'grabbing';
    });
    controls.addEventListener('end', () => {
      dom.style.cursor = 'grab';
    });

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

    // 6. Generate Micro-Topography Geometry
    const segs = 128;
    const geometry = new THREE.PlaneGeometry(3.2, 3.2, segs, segs);

    // 5-Color Photography Color Scheme Nodes:
    // 0.00: Business Burgundy (#401421) - deepest pit / cavity floor
    // 0.25: Dusty Strawberry (#B9485A) - lower pit slope
    // 0.50: Peach Brown (#CE9770) - nominal coating baseline
    // 0.75: Schist (#A6B890) - upper relief slope
    // 1.00: Winter Hazel (#D0CB93) - highest crest / peak
    const colorNodes = [
      new THREE.Color('#401421'),
      new THREE.Color('#B9485A'),
      new THREE.Color('#CE9770'),
      new THREE.Color('#A6B890'),
      new THREE.Color('#D0CB93'),
    ];

    const getSurfaceColor = (t) => {
      const clamped = Math.min(1.0, Math.max(0.0, t));
      if (clamped <= 0.25) {
        const localT = clamped / 0.25;
        return new THREE.Color().copy(colorNodes[0]).lerp(colorNodes[1], localT);
      } else if (clamped <= 0.50) {
        const localT = (clamped - 0.25) / 0.25;
        return new THREE.Color().copy(colorNodes[1]).lerp(colorNodes[2], localT);
      } else if (clamped <= 0.75) {
        const localT = (clamped - 0.50) / 0.25;
        return new THREE.Color().copy(colorNodes[2]).lerp(colorNodes[3], localT);
      } else {
        const localT = (clamped - 0.75) / 0.25;
        return new THREE.Color().copy(colorNodes[3]).lerp(colorNodes[4], localT);
      }
    };

    const buildMesh = (depthMapImg) => {
      let canvas, ctx, imgData;
      if (depthMapImg) {
        canvas = document.createElement('canvas');
        canvas.width = segs + 1;
        canvas.height = segs + 1;
        ctx = canvas.getContext('2d');
        ctx.drawImage(depthMapImg, 0, 0, segs + 1, segs + 1);
        imgData = ctx.getImageData(0, 0, segs + 1, segs + 1).data;
      }

      const pos = geometry.attributes.position;
      const count = pos.count;
      const colors = new Float32Array(count * 3);

      // Pass 1: compute raw elevation with centered baseline (nominal surface = 0)
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (let i = 0; i < count; i++) {
        let zVal = 0;
        if (imgData) {
          const r = imgData[i * 4];
          const g = imgData[i * 4 + 1];
          const b = imgData[i * 4 + 2];
          // Grayscale luminance
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
          // Centered around nominal baseline (0.5)
          zVal = (lum - 0.5) * heightScale;
        } else {
          // Synthetic procedural defect topography:
          // Healthy nominal surface has gentle micro-roughness around z = 0
          const vx = pos.getX(i);
          const vy = pos.getY(i);
          const micro = (Math.sin(vx * 10) * Math.cos(vy * 10) * 0.02) + (Math.sin(vx * 22 + vy * 16) * 0.01);
          // Localized pit depression (descends below nominal surface into negative Z)
          const distPit = Math.sqrt((vx - 0.25) ** 2 + (vy - 0.2) ** 2);
          const pit = -Math.exp(-distPit * 7.0) * 0.32;
          // Localized mechanical scratch / abrasion groove (negative Z)
          const distScratch = Math.abs(vx + vy * 0.45);
          const scratch = distScratch < 0.07 && Math.abs(vx) < 1.0 ? -0.16 * (1.0 - distScratch / 0.07) : 0.0;
          // Localized blister anomaly (rises above nominal surface into positive Z)
          const distBlister = Math.sqrt((vx + 0.55) ** 2 + (vy + 0.35) ** 2);
          const blister = Math.exp(-distBlister * 8.0) * 0.28;

          zVal = (micro + pit + scratch + blister) * (heightScale / 0.35);
        }

        pos.setZ(i, zVal);
        if (zVal < minZ) minZ = zVal;
        if (zVal > maxZ) maxZ = zVal;
      }

      // Pass 2: calculate normalized elevation 't' so middle colors dominate nominal surface
      const range = (maxZ - minZ) > 0.0001 ? (maxZ - minZ) : 1.0;

      for (let i = 0; i < count; i++) {
        const zVal = pos.getZ(i);
        // Normalize across full range [0, 1]
        const t = (zVal - minZ) / range;
        const col = getSurfaceColor(t);

        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.60,
        metalness: 0.08,
        wireframe: wireframe,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      setSingleTopologyMesh(mesh);

      setStats({
        vertices: pos.count,
        faces: geometry.index ? geometry.index.count / 3 : (segs * segs * 2)
      });
      setLoading3D(false);
    };

    const startMeshConstruction = async () => {
      if (meshUrl) {
        try {
          const token = getAuthToken();
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const response = await fetch(meshUrl, { headers });
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const loader = new PLYLoader();
            const plyGeometry = loader.parse(buffer);

            // WebGL does not support 64-bit float attributes (Float64Array).
            // Open3D writes 'property double' for positions and normals,
            // causing PLYLoader to create Float64BufferAttribute instances.
            // When WebGLAttributes uploads them to the GPU, Three.js throws:
            // "THREE.WebGLAttributes: Unsupported buffer data format: [object Float64Array]"
            // at three.module-Bj7iJlUn.js:42053.
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

            // Shading material with vertex colors or depth elevation tinting
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
            return;
          }
        } catch (err) {
          console.warn('Authenticated PLY load note, continuing to photometric relief fallback:', err);
        }
      }

      // Fallback: 2D photometric elevation displacement
      if (imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => buildMesh(img);
        img.onerror = () => buildMesh(null);
        img.src = imageUrl;
      } else {
        buildMesh(null);
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

    // 8. Handle container resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth || 600;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      geometry.dispose();
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
    };
  }, [meshUrl, imageUrl, heightScale]);

  // Wireframe toggle update
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      meshRef.current.material.wireframe = wireframe;
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
      const factor = direction === 'in' ? 0.85 : 1.18;
      cameraRef.current.position.multiplyScalar(factor);
      controlsRef.current.update();
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
          <div className="w-7 h-7 rounded border border-grayGreen/50 bg-surface-darker flex items-center justify-center text-matteSage">
            <Box className="w-3.5 h-3.5 text-matteSage" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-matteSage font-bold">
                Three-Dimensional Surface Analysis
              </span>
              <span className="text-[10px] font-mono text-greige/40">|</span>
              <span className="text-[10px] font-mono text-greige">Surface Topography</span>
            </div>
            <h3 className="text-xs font-semibold text-fullWhite font-sans">
              {title}
            </h3>
          </div>
        </div>

        {/* Technical Instrument Controls */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
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
      <div className="relative bg-surface-darker select-none pointer-events-auto">
        <div
          ref={mountRef}
          className="w-full h-[440px] select-none touch-none focus:outline-hidden"
          tabIndex={0}
          aria-label="3D Micro-Topography Viewer"
        />

        {loading3D && (
          <div className="absolute inset-0 bg-surface-darker/90 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="text-center space-y-2.5">
              <div className="w-7 h-7 mx-auto border-2 border-matteSage border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-mono font-semibold text-fullWhite tracking-wider uppercase">
                Generating Surface Model
              </p>
              <p className="text-[11px] font-mono text-greige">
                Calculating surface normals and heightfield variation...
              </p>
            </div>
          </div>
        )}

        {/* Viewport Scale Indicator */}
        <div className="absolute top-3 left-3 bg-surface-darker/90 backdrop-blur-xs px-2.5 py-1.5 rounded border border-white/10 text-[10px] font-mono text-greige pointer-events-none">
          <div>ELEVATION SCALE: <span className="text-matteSage font-semibold">{heightScale.toFixed(2)}x</span></div>
        </div>

        {/* Telemetry Overlay */}
        <div className="absolute top-3 right-3 bg-surface-darker/90 backdrop-blur-xs px-2.5 py-1.5 rounded border border-white/10 text-[10px] font-mono space-x-3 pointer-events-none">
          <span className="text-greige">VERTICES: <strong className="text-fullWhite">{stats.vertices.toLocaleString()}</strong></span>
          <span className="text-greige">FACETS: <strong className="text-fullWhite">{stats.faces.toLocaleString()}</strong></span>
        </div>

        {/* Continuous 5-Color Photography Palette Elevation Legend */}
        <div className="absolute bottom-3 left-3 bg-surface-darker/95 backdrop-blur-xs px-3 py-2 rounded border border-white/10 text-[10px] font-mono flex flex-wrap items-center gap-3 pointer-events-none">
          <span className="text-matteSage font-bold uppercase tracking-wider">Elevation:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#401421] border border-white/20"></span>
            <span className="text-greige">Deep Cavity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#B9485A] border border-white/20"></span>
            <span className="text-greige">Depression</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#CE9770] border border-white/20"></span>
            <span className="text-fullWhite font-medium">Nominal Coating</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#A6B890] border border-white/20"></span>
            <span className="text-greige">Upper Relief</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#D0CB93] border border-white/30"></span>
            <span className="text-matteSage font-semibold">Surface Peak</span>
          </div>
        </div>
      </div>

      {/* Footer Instructions & Export Strip */}
      <div className="px-4 py-2 border-t border-white/10 bg-surface-dark/70 flex items-center justify-between text-[11px] font-mono text-greige">
        <div className="flex items-center gap-3">
          <span>Left Drag: Orbit</span>
          <span>•</span>
          <span>Wheel: Zoom</span>
          <span>•</span>
          <span>Right Drag: Pan</span>
        </div>
        {meshUrl && (
          <a
            href={meshUrl}
            download="surface_topography.ply"
            className="text-matteSage hover:underline font-semibold flex items-center gap-1 nav-transition"
          >
            <Download className="w-3 h-3 text-matteSage" />
            <span>Download Surface Mesh (.PLY)</span>
          </a>
        )}
      </div>
    </div>
  );
}
