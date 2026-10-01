import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Box, RotateCw, ZoomIn, ZoomOut, Eye, Layers, Download } from 'lucide-react';

export default function Interactive3DTopography({
  imageUrl,
  meshUrl,
  heightScale = 0.35,
  title = "Surface Micro-Topography"
}) {
  const mountRef = useRef(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [stats, setStats] = useState({ vertices: 16384, faces: 32258 });
  const [loading3D, setLoading3D] = useState(true);

  const sceneRef = useRef(null);
  const meshRef = useRef(null);
  const rendererRef = useRef(null);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!mountRef.current) return;
    setLoading3D(true);

    const width = mountRef.current.clientWidth || 600;
    const height = 400;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a); // sleek navy/slate

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, -3.2, 3.5);
    camera.lookAt(0, 0, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(4, 5, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.6);
    dirLight2.position.set(-4, -5, -2);
    scene.add(dirLight2);

    // 5. Generate Micro-Topography Geometry from Image / Texture
    const segs = 128;
    const geometry = new THREE.PlaneGeometry(3.5, 3.5, segs, segs);

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

      for (let i = 0; i < count; i++) {
        let zVal = 0;
        if (imgData) {
          const r = imgData[i * 4];
          const g = imgData[i * 4 + 1];
          const b = imgData[i * 4 + 2];
          // Grayscale luminance
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
          // Invert so dark defects (pits, scratches, holidays) form visible depressions
          zVal = (1.0 - lum) * heightScale;
        } else {
          // Synthetic procedural defect topography (localized pits & scratches)
          const vx = pos.getX(i);
          const vy = pos.getY(i);
          const dist1 = Math.sqrt((vx - 0.3)**2 + (vy - 0.2)**2);
          const pit = Math.exp(-dist1 * 6.0) * 0.45;
          const scratch = Math.abs(vx + vy * 0.6) < 0.08 ? 0.3 : 0.0;
          zVal = pit + scratch + (Math.sin(vx * 15) * Math.cos(vy * 15) * 0.03);
        }

        pos.setZ(i, zVal);

        // Height colormap (Thermal/Marine defense elevation: blue -> emerald -> amber)
        const t = Math.min(1.0, Math.max(0.0, zVal / (heightScale * 1.2 || 0.4)));
        const col = new THREE.Color();
        if (t < 0.25) {
          col.setHSL(0.6, 0.8, 0.3 + t); // Deep ocean blue
        } else if (t < 0.6) {
          col.setHSL(0.38, 0.8, 0.45); // Emerald coating
        } else {
          col.setHSL(0.08, 0.85, 0.55); // Bronze / warning peak
        }
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.4,
        metalness: 0.25,
        wireframe: wireframe,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 4;
      scene.add(mesh);
      meshRef.current = mesh;

      setStats({
        vertices: pos.count,
        faces: geometry.index ? geometry.index.count / 3 : (segs * segs * 2)
      });
      setLoading3D(false);
    };

    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => buildMesh(img);
      img.onerror = () => buildMesh(null);
      img.src = imageUrl;
    } else {
      buildMesh(null);
    }

    // 6. Animation loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (meshRef.current && autoRotate && !isDraggingRef.current) {
        meshRef.current.rotation.z += 0.004;
      }
      renderer.render(scene, camera);
    };
    animate();

    // 7. Mouse interaction (Orbit controls without external package)
    const dom = renderer.domElement;

    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current || !meshRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      meshRef.current.rotation.z += dx * 0.008;
      meshRef.current.rotation.x += dy * 0.008;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = Math.max(1.8, Math.min(7.0, camera.position.z + e.deltaY * 0.004));
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const newW = mountRef.current.clientWidth;
      camera.aspect = newW / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
    };
  }, [imageUrl, heightScale]);

  // Update wireframe live
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      meshRef.current.material.wireframe = wireframe;
    }
  }, [wireframe]);

  return (
    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/90 shadow-lg relative">
      {/* Top Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-slate-800/90 text-slate-200 text-xs font-mono border border-slate-700 backdrop-blur-xs flex items-center gap-1.5 shadow-xs">
            <Box className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open3D Micro-Topography</span>
          </span>
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-[11px] font-mono border border-emerald-700/60">
            {stats.vertices.toLocaleString()} Vertices • {stats.faces.toLocaleString()} Triangles
          </span>
        </div>

        {/* Interactive View Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-full border border-slate-700 backdrop-blur-xs shadow-xs">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle Auto Rotation"
            className={`p-1.5 rounded-full text-xs transition-colors ${
              autoRotate ? 'bg-emerald-500 text-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setWireframe(!wireframe)}
            title="Toggle Wireframe Mesh"
            className={`p-1.5 rounded-full text-xs transition-colors ${
              wireframe ? 'bg-blue-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-[400px] cursor-grab active:cursor-grabbing"></div>

      {/* Bottom overlay bar with instructions */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none px-2">
        <span>Click & drag to rotate • Scroll to zoom</span>
        {meshUrl && (
          <a
            href={meshUrl}
            download="marine_micro_mesh.ply"
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs transition-all shadow-xs"
          >
            <Download className="w-3 h-3" />
            Download .PLY
          </a>
        )}
      </div>

      {loading3D && (
        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white gap-2 z-20">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-emerald-300">Generating 3D Micro-Topography Mesh...</span>
        </div>
      )}
    </div>
  );
}
