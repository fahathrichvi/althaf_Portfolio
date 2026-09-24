/* Copyright (c) 2026 Fahath Richvi. All rights reserved.
   Portfolio website for Mohammed Althaf — designed & developed by Fahath Richvi.
   Commercial use without written permission is prohibited. See LICENSE.
*/

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const ORANGE = 0xff7a1a, AMBER = 0xffb13b, RED = 0xff2e4d, BLUE = 0x1f8fff, CYAN = 0x22d3ff;
const BG = 0x030305;
const BOARD_Y = -3;
const TUNNEL_Z = -58;

const canvas = document.getElementById("bg");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = window.innerWidth < 820;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (err) {
  // No WebGL: the page still works over the plain black background
  console.warn("WebGL unavailable, skipping 3D scene", err);
}
function init() {
  const rand = THREE.MathUtils.randFloat;
  const randInt = THREE.MathUtils.randInt;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.032);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0.8, 10);

  const glowTex = makeGlowTexture();
  const ringTex = makeRingTexture();

  // ---------- Lights ----------
  scene.add(new THREE.AmbientLight(0x2a2230, 0.8));
  const rim = new THREE.DirectionalLight(0x6fa8ff, 1.1);
  rim.position.set(-6, 5, 4);
  scene.add(rim);
  const warm = new THREE.PointLight(ORANGE, 40, 22, 1.6);
  warm.position.set(6, 2, 5);
  scene.add(warm);

  // =====================================================
  // 1. NEXUS CUBE — dark metal voxels around a red-hot core
  // =====================================================
  const nexus = new THREE.Group();
  scene.add(nexus);

  const voxelMat = new THREE.MeshStandardMaterial({ color: 0x17171d, metalness: 0.9, roughness: 0.32 });
  const seamMat = new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.55 });
  const voxels = [];
  const addVoxel = (pos, size) => {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, voxelMat);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), seamMat));
    mesh.position.copy(pos);
    mesh.userData = {
      base: pos.clone(),
      dir: pos.clone().normalize(),
      axis: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(),
      spin: rand(0.6, 2.2),
      jitter: rand(0, Math.PI * 2),
    };
    nexus.add(mesh);
    voxels.push(mesh);
  };
  const GAP = 0.7;
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue; // core lives here
        if (x === 0 && y === 0 && z === 1) continue; // window onto the core
        if (x === 1 && y === 1 && z === 1) continue; // broken corner
        const p = new THREE.Vector3(x, y, z).multiplyScalar(GAP);
        // some blocks are split into smaller "fractured" pieces
        if (Math.random() < 0.3) {
          for (let i = 0; i < 8; i++) {
            const o = new THREE.Vector3(i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1).multiplyScalar(0.16);
            if (Math.random() < 0.85) addVoxel(p.clone().add(o), 0.29);
          }
        } else {
          addVoxel(p, 0.62);
        }
      }
    }
  }

  const core = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), new THREE.MeshBasicMaterial({ color: 0xff3b1f }));
  nexus.add(core);
  const coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.66, 0.66, 0.66)),
    new THREE.LineBasicMaterial({ color: AMBER })
  );
  nexus.add(coreWire);
  const coreLight = new THREE.PointLight(0xff4a1a, 30, 7, 1.4);
  nexus.add(coreLight);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff3a1a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(4.5);
  nexus.add(halo);

  // Orbit rings with travelling sparks
  const orbits = [];
  [
    { rx: 3.1, ry: 2.1, color: RED, opacity: 0.7, rot: [1.15, 0.2, 0.35], speed: 0.35 },
    { rx: 3.7, ry: 2.5, color: ORANGE, opacity: 0.4, rot: [1.35, -0.35, -0.5], speed: -0.22 },
  ].forEach((o) => {
    const group = new THREE.Group();
    group.rotation.set(...o.rot);
    const curve = new THREE.EllipseCurve(0, 0, o.rx, o.ry);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(160)),
      new THREE.LineBasicMaterial({ color: o.color, transparent: true, opacity: o.opacity })
    );
    group.add(line);
    const sparks = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: o.color, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.45);
      s.userData.offset = i / 3;
      group.add(s);
      sparks.push(s);
    }
    nexus.add(group);
    orbits.push({ group, curve, sparks, speed: o.speed });
  });

  // Holographic pedestal rings under the cube
  const pedestal = new THREE.Group();
  pedestal.position.y = -2.3;
  pedestal.rotation.x = -Math.PI / 2;
  [1.2, 1.7, 2.3].forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r, r + 0.025, 96),
      new THREE.MeshBasicMaterial({ color: i === 1 ? BLUE : ORANGE, transparent: true, opacity: 0.5 - i * 0.12, side: THREE.DoubleSide })
    );
    pedestal.add(ring);
  });
  nexus.add(pedestal);

  // Embers drifting around the cube
  const EMBERS = 140;
  const emberPos = new Float32Array(EMBERS * 3);
  const emberCol = new Float32Array(EMBERS * 3);
  const emberSeed = [];
  const warmCols = [new THREE.Color(RED), new THREE.Color(ORANGE), new THREE.Color(AMBER)];
  for (let i = 0; i < EMBERS; i++) {
    emberSeed.push({ r: rand(1.6, 4.8), a: rand(0, Math.PI * 2), y: rand(-2.5, 2.5), s: rand(0.1, 0.4) });
    pick(warmCols).toArray(emberCol, i * 3);
  }
  const embers = new THREE.Points(
    new THREE.BufferGeometry()
      .setAttribute("position", new THREE.BufferAttribute(emberPos, 3))
      .setAttribute("color", new THREE.BufferAttribute(emberCol, 3)),
    new THREE.PointsMaterial({ size: 0.09, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  nexus.add(embers);

  // =====================================================
  // 2. CIRCUIT BOARD — traces, chips and travelling pulses
  // =====================================================
  const board = new THREE.Group();
  board.position.y = BOARD_Y;
  scene.add(board);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 220),
    new THREE.MeshStandardMaterial({ color: 0x07070b, metalness: 0.7, roughness: 0.75 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.z = -70;
  board.add(plane);

  const STEP = 0.5;
  const snap = (v) => Math.round(v / STEP) * STEP;
  const traceColor = (x) => {
    const t = x / 18;
    let pool;
    if (t < -0.15) pool = [ORANGE, AMBER, ORANGE, RED];
    else if (t > 0.15) pool = [BLUE, CYAN, BLUE];
    else pool = [RED, ORANGE, CYAN];
    if (Math.random() < 0.15) pool = [RED, AMBER, CYAN, BLUE];
    return new THREE.Color(pick(pool));
  };
  const nextDir = ([dx, dz]) => {
    if (dx === 0) return [Math.random() < 0.5 ? 1 : -1, dz];            // straight -> diagonal
    if (dz === 0) return [dx, Math.random() < 0.7 ? -1 : 1];
    return Math.random() < 0.65 ? [0, dz] : [dx, 0];                     // diagonal -> straight
  };

  const traces = [];
  const TRACE_COUNT = small ? 110 : 190;
  for (let i = 0; i < TRACE_COUNT; i++) {
    let x = snap(rand(-20, 20));
    let z = snap(rand(-125, 14));
    const pts = [new THREE.Vector3(x, 0.02, z)];
    let dir = Math.random() < 0.7 ? [0, -1] : [Math.random() < 0.5 ? 1 : -1, 0];
    const segs = randInt(3, 8);
    for (let s = 0; s < segs; s++) {
      const len = randInt(2, 10) * STEP;
      x += dir[0] * len;
      z += dir[1] * len;
      pts.push(new THREE.Vector3(x, 0.02, z));
      dir = nextDir(dir);
    }
    traces.push({ pts, color: traceColor(pts[0].x) });
  }

  // Chips with glowing edges and pins
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x0d0d13, metalness: 0.8, roughness: 0.4 });
  const pinSegments = [];
  const CHIP_COUNT = small ? 12 : 22;
  for (let i = 0; i < CHIP_COUNT; i++) {
    const w = rand(0.9, 2.6), d = rand(0.9, 2.6), h = rand(0.12, 0.3);
    const cx = snap(rand(-16, 16));
    const cz = snap(rand(-110, 6));
    if (Math.abs(cx) < 2.5 && cz > -8) continue; // keep the hero sightline clear
    const col = new THREE.Color(pick([ORANGE, BLUE, RED, CYAN, AMBER]));
    const geo = new THREE.BoxGeometry(w, h, d);
    const chip = new THREE.Mesh(geo, chipMat);
    chip.position.set(cx, h / 2, cz);
    chip.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: col })));
    if (Math.random() < 0.35) {
      const top = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.7, d * 0.7),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 })
      );
      top.rotation.x = -Math.PI / 2;
      top.position.y = h / 2 + 0.01;
      chip.add(top);
    }
    board.add(chip);
    // pins along each edge
    for (let px = -w / 2 + 0.15; px < w / 2 - 0.1; px += 0.22) {
      pinSegments.push([new THREE.Vector3(cx + px, 0.02, cz - d / 2), new THREE.Vector3(cx + px, 0.02, cz - d / 2 - 0.25), col]);
      pinSegments.push([new THREE.Vector3(cx + px, 0.02, cz + d / 2), new THREE.Vector3(cx + px, 0.02, cz + d / 2 + 0.25), col]);
    }
    for (let pz = -d / 2 + 0.15; pz < d / 2 - 0.1; pz += 0.22) {
      pinSegments.push([new THREE.Vector3(cx - w / 2, 0.02, cz + pz), new THREE.Vector3(cx - w / 2 - 0.25, 0.02, cz + pz), col]);
      pinSegments.push([new THREE.Vector3(cx + w / 2, 0.02, cz + pz), new THREE.Vector3(cx + w / 2 + 0.25, 0.02, cz + pz), col]);
    }
    // a soft glow pooled on the board under some chips
    if (Math.random() < 0.5) {
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.position.set(cx, 0.3, cz);
      g.scale.setScalar(Math.max(w, d) * 2.2);
      board.add(g);
    }
  }

  // All traces + pins as one LineSegments draw call
  const linePos = [];
  const lineCol = [];
  const dim = 0.55;
  traces.forEach(({ pts, color }) => {
    for (let i = 0; i < pts.length - 1; i++) {
      linePos.push(...pts[i].toArray(), ...pts[i + 1].toArray());
      for (let k = 0; k < 2; k++) lineCol.push(color.r * dim, color.g * dim, color.b * dim);
    }
  });
  pinSegments.forEach(([a, b, c]) => {
    linePos.push(...a.toArray(), ...b.toArray());
    for (let k = 0; k < 2; k++) lineCol.push(c.r * 0.7, c.g * 0.7, c.b * 0.7);
  });
  const traceGeo = new THREE.BufferGeometry();
  traceGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  traceGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineCol, 3));
  board.add(new THREE.LineSegments(traceGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })));

  // Pads at trace ends
  const padPos = [];
  const padCol = [];
  traces.forEach(({ pts, color }) => {
    [pts[0], pts[pts.length - 1]].forEach((p) => {
      padPos.push(p.x, 0.03, p.z);
      padCol.push(color.r, color.g, color.b);
    });
  });
  const padGeo = new THREE.BufferGeometry();
  padGeo.setAttribute("position", new THREE.Float32BufferAttribute(padPos, 3));
  padGeo.setAttribute("color", new THREE.Float32BufferAttribute(padCol, 3));
  board.add(new THREE.Points(padGeo, new THREE.PointsMaterial({ size: 0.32, map: ringTex, vertexColors: true, transparent: true, depthWrite: false })));

  // Pulses of light running along the traces
  const pulses = traces
    .filter((t) => t.pts.length > 2)
    .slice(0, small ? 60 : 110)
    .map(({ pts, color }) => {
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
      const bright = color.clone().lerp(new THREE.Color(0xffffff), 0.35);
      return { pts, cum, total: cum[cum.length - 1], offset: Math.random(), speed: rand(1.5, 4.5), color: bright };
    });
  const pulsePos = new Float32Array(pulses.length * 3);
  const pulseCol = new Float32Array(pulses.length * 3);
  pulses.forEach((p, i) => p.color.toArray(pulseCol, i * 3));
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
  pulseGeo.setAttribute("color", new THREE.BufferAttribute(pulseCol, 3));
  board.add(new THREE.Points(pulseGeo, new THREE.PointsMaterial({ size: 0.42, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));

  // =====================================================
  // 3. FLOATING CODE WALLS + BOKEH
  // =====================================================
  const palettes = [
    ["#ff7a1a", "#ffb13b", "#ff2e4d", "#ffd9a8"],
    ["#1f8fff", "#22d3ff", "#9fd8ff", "#6c7bff"],
    ["#22d3ff", "#ff2e8a", "#7dff6a", "#ffb13b", "#b06cff", "#ff4a2a"],
  ];
  const codeTextures = palettes.map((p) => makeCodeTexture(p));
  const codeWalls = [];
  const WALLS = small ? 8 : 12;
  for (let i = 0; i < WALLS; i++) {
    const left = i % 2 === 0;
    const tex = codeTextures[left ? (i % 4 === 0 ? 0 : 2) : (i % 4 === 1 ? 1 : 2)];
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    wall.position.set(left ? rand(-10.5, -8.5) : rand(8.5, 10.5), rand(0, 1.5), -14 - i * 4);
    wall.rotation.y = left ? 0.95 : -0.95;
    wall.userData.baseY = wall.position.y;
    scene.add(wall);
    codeWalls.push(wall);
  }

  // Out-of-focus bokeh: warm on the left, cool on the right
  const makeBokeh = (count, xMin, xMax, color) => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos.set([rand(xMin, xMax), rand(-2, 7), rand(-110, 4)], i * 3);
    }
    const pts = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ size: 0.9, map: glowTex, color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(pts);
    return pts;
  };
  const bokehWarm = makeBokeh(small ? 90 : 160, -26, -3, ORANGE);
  const bokehCool = makeBokeh(small ? 90 : 160, 3, 26, BLUE);

  // Distant star dust
  const DUST = 900;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dustPos.set([rand(-60, 60), rand(-5, 40), rand(-150, 10)], i * 3);
  scene.add(new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(dustPos, 3)),
    new THREE.PointsMaterial({ size: 0.06, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })
  ));

  // =====================================================
  // 4. CODE WORMHOLE at the end of the flight
  // =====================================================
  const tunnelTex = makeCodeTexture(palettes[2].concat(palettes[0]));
  tunnelTex.wrapS = tunnelTex.wrapT = THREE.RepeatWrapping;
  tunnelTex.repeat.set(4, 3);
  const tunnelMat = new THREE.MeshBasicMaterial({ map: tunnelTex, side: THREE.BackSide, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 1.2, 50, 48, 1, true), tunnelMat);
  tunnel.rotation.x = Math.PI / 2;
  tunnel.position.set(0, 0.4, TUNNEL_Z - 25);
  scene.add(tunnel);
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(4.3, 0.07, 12, 120),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0, fog: false })
  );
  mouth.position.set(0, 0.4, TUNNEL_Z);
  scene.add(mouth);
  const mouthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff5a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  mouthGlow.scale.setScalar(16);
  mouthGlow.position.copy(mouth.position);
  scene.add(mouthGlow);

  // =====================================================
  // Post-processing: bloom makes everything glow
  // =====================================================
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.5, 0.15);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- Interaction ----------
  const mouse = new THREE.Vector2();
  const target = new THREE.Vector2();
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let scrollProgress = 0;
  let heroProgress = 0;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    heroProgress = Math.min(window.scrollY / window.innerHeight, 1);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const nexusBase = new THREE.Vector3();
  let nexusScale = 1;
  const layout = () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    if (w > 1080) { nexusBase.set(3.3, 0.5, 0); nexusScale = 1; }
    else if (w > 820) { nexusBase.set(2.5, 0.5, 0); nexusScale = 0.85; }
    else { nexusBase.set(0.4, 3.3, -1.5); nexusScale = 0.5; }
  };
  window.addEventListener("resize", layout);
  layout();

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const lookAt = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const speed = reduceMotion ? 0.15 : 1;
    target.lerp(mouse, 0.05);

    const sp = scrollProgress;
    const hp = THREE.MathUtils.smoothstep(heroProgress, 0, 1);

    // Camera flies forward over the board as the page scrolls
    const camZ = 10 - sp * (10 - TUNNEL_Z + 4);
    camera.position.x += (target.x * 0.9 + Math.sin(sp * Math.PI * 2) * 1.2 - camera.position.x) * 0.06;
    camera.position.y += (0.8 - sp * 0.3 - target.y * 0.45 - camera.position.y) * 0.06;
    camera.position.z += (camZ - camera.position.z) * 0.08;
    lookAt.set(camera.position.x * 0.4, -0.5 + sp * 0.8, camera.position.z - 12);
    camera.lookAt(lookAt);

    // Nexus: breathes, then breaks apart as you leave the hero
    nexus.position.copy(nexusBase);
    nexus.position.y += Math.sin(t * 0.9) * 0.15 * speed;
    nexus.scale.setScalar(nexusScale);
    nexus.rotation.y = t * 0.25 * speed + target.x * 0.6;
    nexus.rotation.x = 0.35 + target.y * 0.3;
    const breathe = (Math.sin(t * 1.6 * speed) + 1) * 0.04;
    voxels.forEach((v) => {
      const u = v.userData;
      const burst = hp * (2.4 + Math.sin(u.jitter) * 0.8);
      v.position.copy(u.base).addScaledVector(u.dir, breathe + burst);
      v.rotation.set(0, 0, 0);
      v.rotateOnAxis(u.axis, hp * u.spin * 2 + Math.sin(t + u.jitter) * 0.03);
    });
    seamMat.opacity = 0.45 + Math.sin(t * 2.2) * 0.15;
    core.rotation.set(t * 0.8 * speed, t * 1.1 * speed, 0);
    coreWire.rotation.set(-t * 0.5 * speed, -t * 0.7 * speed, 0);
    const pulse = 1 + Math.sin(t * 3) * 0.08;
    core.scale.setScalar(pulse);
    halo.material.opacity = 0.45 + Math.sin(t * 3) * 0.12;
    coreLight.intensity = 26 + Math.sin(t * 3) * 6;

    orbits.forEach((o) => {
      o.group.rotation.z += o.speed * dt * speed;
      o.sparks.forEach((s) => {
        const u = (s.userData.offset + t * 0.08 * speed) % 1;
        const p = o.curve.getPoint(u);
        s.position.set(p.x, p.y, 0);
      });
    });
    pedestal.rotation.z = t * 0.3 * speed;

    const ep = embers.geometry.attributes.position.array;
    emberSeed.forEach((e, i) => {
      const a = e.a + t * e.s * speed;
      const y = ((e.y + t * e.s * 0.6 * speed + 2.5) % 5) - 2.5;
      ep[i * 3] = Math.cos(a) * e.r;
      ep[i * 3 + 1] = y;
      ep[i * 3 + 2] = Math.sin(a) * e.r;
    });
    embers.geometry.attributes.position.needsUpdate = true;

    // Pulses along traces
    pulses.forEach((p, i) => {
      let d = ((p.offset * p.total + t * p.speed * speed) % p.total);
      let k = 1;
      while (k < p.cum.length - 1 && p.cum[k] < d) k++;
      const segLen = p.cum[k] - p.cum[k - 1] || 1;
      tmp.lerpVectors(p.pts[k - 1], p.pts[k], (d - p.cum[k - 1]) / segLen);
      pulsePos[i * 3] = tmp.x;
      pulsePos[i * 3 + 1] = 0.06;
      pulsePos[i * 3 + 2] = tmp.z;
    });
    pulseGeo.attributes.position.needsUpdate = true;

    codeWalls.forEach((w, i) => { w.position.y = w.userData.baseY + Math.sin(t * 0.5 + i) * 0.25; });
    bokehWarm.rotation.y = Math.sin(t * 0.05) * 0.02;
    bokehCool.rotation.y = -Math.sin(t * 0.05) * 0.02;

    // Wormhole fades in over the last part of the page
    const endP = THREE.MathUtils.smoothstep(sp, 0.55, 1);
    tunnelMat.opacity = endP * 0.85;
    mouth.material.opacity = endP;
    mouthGlow.material.opacity = endP * 0.5;
    tunnelTex.offset.y -= dt * 0.06 * speed;
    tunnel.rotation.y = t * 0.1 * speed;
    mouth.rotation.z = t * 0.2;

    warm.position.x = 6 + Math.sin(t * 0.4) * 3;
    warm.position.z = camera.position.z - 5;

    composer.render();
    requestAnimationFrame(tick);
  };
  tick();
}

// ---------- Texture helpers ----------
function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.7)");
  g.addColorStop(0.5, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeRingTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(32, 32, 22, 0, Math.PI * 2);
  ctx.stroke();
  return new THREE.CanvasTexture(c);
}

const CODE_LINES = [
  "import React, { useState, useEffect } from 'react';",
  "const app = express();",
  "app.use(express.json());",
  "app.get('/api/users', auth, async (req, res) => {",
  "  const users = await db.query('SELECT * FROM users');",
  "  res.json(users);",
  "});",
  "router.post('/booking', validate, createBooking);",
  "await mongoose.connect(process.env.MONGO_URI);",
  "if (!token) return res.status(401).json({ error });",
  "const role = user.isAdmin ? 'admin' : 'user';",
  "jwt.sign({ id: user.id }, SECRET, { expiresIn: '1d' });",
  "export default function Dashboard({ data }) {",
  "  const [cart, setCart] = useState([]);",
  "  useEffect(() => { fetchOrders(); }, []);",
  "  return <Chart data={data} type=\"bar\" />;",
  "SELECT id, name, price FROM products WHERE stock > 0;",
  "INSERT INTO appointments (user_id, slot) VALUES (?, ?);",
  ".grid { display: grid; grid-template-columns: repeat(3, 1fr); }",
  "@media (max-width: 768px) { .nav { flex-direction: column; } }",
  "for (const item of cart) total += item.price * item.qty;",
  "git commit -m \"feat: add admin panel\"",
  "npm run build && npm start",
  "<section class=\"hero\"><h1>Hello World</h1></section>",
  "const slots = calendar.filter(s => !s.booked);",
  "fetch('/api/products').then(r => r.json()).then(render);",
  "function toCode(idea) { return idea.split('').map(build); }",
];

function makeCodeTexture(palette) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d");
  ctx.textBaseline = "top";
  let y = 10;
  while (y < 1010) {
    const size = Math.random() < 0.12 ? 44 : Math.random() < 0.5 ? 26 : 20;
    const blur = size > 40 ? 3 : Math.random() < 0.25 ? 1.5 : 0;
    ctx.filter = blur ? `blur(${blur}px)` : "none";
    ctx.font = `600 ${size}px "JetBrains Mono", monospace`;
    ctx.globalAlpha = 0.45 + Math.random() * 0.55;
    const col = palette[Math.floor(Math.random() * palette.length)];
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    const line = CODE_LINES[Math.floor(Math.random() * CODE_LINES.length)];
    ctx.fillText(line, 10 + Math.floor(Math.random() * 6) * 24, y);
    y += size * 1.45;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Start once every helper and constant above is defined
if (renderer) init();
