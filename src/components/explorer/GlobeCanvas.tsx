import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CATEGORY_COLORS, formatYear } from '../../utils/date';
import type { HistoricalEvent } from '../../types';

interface Props {
  events: HistoricalEvent[];
  onSelect: (e: HistoricalEvent) => void;
  reducedMotion: boolean;
}

const RADIUS = 1.6;

/**
 * Lightweight Three.js globe (no texture dependency — procedural wireframe
 * sphere with graticule), event markers from coordinates, connective arcs,
 * raycast selection. Lazy-loaded by the explorer; unmounts cleanly.
 */
export function GlobeCanvas({ events, onSelect, reducedMotion }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ e: HistoricalEvent; x: number; y: number } | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.4, 4.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // sphere: soft solid + wireframe graticule
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x0a1020, transparent: true, opacity: 0.92 }),
    );
    scene.add(sphere);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(RADIUS, 36, 24)),
      new THREE.LineBasicMaterial({ color: 0x2a3a6a, transparent: true, opacity: 0.28 }),
    );
    scene.add(wire);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.015, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x2266aa, transparent: true, opacity: 0.06, side: THREE.BackSide }),
    );
    scene.add(glow);

    // markers group — rebuilt when events change
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    const latLonToVec3 = (lat: number, lon: number, r: number): THREE.Vector3 => {
      const phi = ((90 - lat) * Math.PI) / 180;
      const theta = ((lon + 180) * Math.PI) / 180;
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
    };

    interface MarkerRecord {
      e: HistoricalEvent;
      mesh: THREE.Mesh;
    }
    const markers: MarkerRecord[] = [];
    const arcs: THREE.Line[] = [];

    const rebuildMarkers = () => {
      markerGroup.clear();
      arcs.length = 0;
      const located = events.filter((e) => e.lat !== undefined && e.lon !== undefined);
      located.forEach((e, i) => {
        const color = new THREE.Color(CATEGORY_COLORS[e.category] ?? '#22d3ee');
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 12, 12),
          new THREE.MeshBasicMaterial({ color }),
        );
        mesh.position.copy(latLonToVec3(e.lat!, e.lon!, RADIUS * 1.01));
        mesh.userData.event = e;
        markerGroup.add(mesh);
        markers.push({ e, mesh });

        // arc to the next located event (animated connections)
        const next = located[(i + 1) % located.length];
        if (next && located.length > 1) {
          const a = latLonToVec3(e.lat!, e.lon!, RADIUS * 1.02);
          const b = latLonToVec3(next.lat!, next.lon!, RADIUS * 1.02);
          const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * (1.18 + a.distanceTo(b) * 0.06));
          const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
          const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
          const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.22 }));
          arcs.push(line);
          markerGroup.add(line);
        }
      });
    };
    rebuildMarkers();

    // raycaster for hover + click
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const pick = (clientX: number, clientY: number): MarkerRecord | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(markerGroup.children, false);
      const mesh = hits[0]?.object;
      if (!mesh) return null;
      return markers.find((m) => m.mesh === mesh) ?? null;
    };

    const onMove = (e: PointerEvent) => {
      const hit = pick(e.clientX, e.clientY);
      setHover(hit ? { e: hit.e, x: e.clientX - mount.getBoundingClientRect().left, y: e.clientY - mount.getBoundingClientRect().top } : null);
      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    };
    const onClick = (e: PointerEvent) => {
      const hit = pick(e.clientX, e.clientY);
      if (hit) selectRef.current(hit.e);
    };

    let dragging = false;
    let lastX = 0;
    let vel = 0.0016;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
    };
    const onUp = () => (dragging = false);
    const onDrag = (e: PointerEvent) => {
      if (!dragging) return;
      vel = (e.clientX - lastX) * 0.00012;
      scene.rotation.y += (e.clientX - lastX) * 0.005;
      lastX = e.clientX;
    };

    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointermove', onDrag);

    let raf = 0;
    const animate = () => {
      if (!dragging && !reducedMotion) scene.rotation.y += vel;
      // gentle marker pulse
      const t = performance.now() / 600;
      markers.forEach((m, i) => {
        const s = 1 + Math.sin(t + i * 0.7) * 0.25;
        m.mesh.scale.setScalar(s);
      });
      renderer.render(scene, camera);
      if (!reducedMotion) raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onDrag);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [events, reducedMotion]);

  return (
    <div ref={mountRef} className="relative h-full w-full" data-testid="globe-canvas">
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg border border-white/10 bg-abyss/95 p-3 text-xs shadow-panel"
          style={{ left: hover.x + 12, top: hover.y - 20 }}
        >
          <p className="font-display font-semibold text-ink">{hover.e.title}</p>
          <p className="mt-1 font-mono text-[10px] text-cyan-glow">{formatYear(hover.e.year)}</p>
          <p className="mt-1 text-faint">Click to inspect</p>
        </div>
      )}
    </div>
  );
}

export default GlobeCanvas;
