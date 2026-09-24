import * as THREE from "three";

const canvas = document.getElementById("bg");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (err) {
  // No WebGL: the CSS grid background still works on its own
  console.warn("WebGL unavailable, skipping 3D scene", err);
}

if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060f, 0.035);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 9);

  // ---------- Lights ----------
  scene.add(new THREE.AmbientLight(0x404080, 1.2));
  const cyanLight = new THREE.PointLight(0x22d3ee, 60, 30);
  cyanLight.position.set(5, 3, 5);
  const pinkLight = new THREE.PointLight(0xec4899, 50, 30);
  pinkLight.position.set(-5, -3, 3);
  scene.add(cyanLight, pinkLight);

  // ---------- Core object ----------
  const core = new THREE.Group();
  scene.add(core);

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 1),
    new THREE.MeshStandardMaterial({
      color: 0x6d28d9,
      emissive: 0x3b0f8c,
      emissiveIntensity: 0.6,
      metalness: 0.6,
      roughness: 0.25,
      flatShading: true,
    })
  );
  core.add(inner);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.95, 1),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.35 })
  );
  core.add(shell);

  // Glowing vertices on the shell
  const vertPoints = new THREE.Points(
    new THREE.IcosahedronGeometry(1.95, 1),
    new THREE.PointsMaterial({ color: 0x9ef3ff, size: 0.08, transparent: true, opacity: 0.9 })
  );
  core.add(vertPoints);

  // Orbit rings
  const rings = [];
  const ringColors = [0x22d3ee, 0x8b5cf6, 0xec4899];
  ringColors.forEach((color, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.6 + i * 0.45, 0.012, 8, 160),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.5;
    ring.rotation.y = (i - 1) * 0.4;
    core.add(ring);
    rings.push(ring);
  });

  // Tech label sprites orbiting the core
  const labels = ["</>", "{ }", "JS", "API", "SQL", "CSS", "UI", "Node"];
  const orbiters = labels.map((text, i) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeLabelTexture(text, i), transparent: true, depthWrite: false })
    );
    sprite.scale.set(0.9, 0.45, 1);
    const orbit = {
      sprite,
      radius: 3 + (i % 3) * 0.45,
      speed: 0.25 + (i % 4) * 0.07,
      offset: (i / labels.length) * Math.PI * 2,
      tilt: (i % 2 ? 1 : -1) * (0.3 + (i % 3) * 0.2),
    };
    core.add(sprite);
    return orbit;
  });

  // Remember each core material's opacity so the whole core can fade out on scroll
  const coreMaterials = [];
  core.traverse((obj) => {
    if (obj.material) {
      obj.material.transparent = true;
      coreMaterials.push({ mat: obj.material, base: obj.material.opacity });
    }
  });

  // Small floating shapes around the scene
  const shapes = [];
  const shapeGeos = [
    new THREE.OctahedronGeometry(0.22),
    new THREE.TetrahedronGeometry(0.25),
    new THREE.BoxGeometry(0.28, 0.28, 0.28),
    new THREE.TorusGeometry(0.18, 0.06, 8, 24),
  ];
  for (let i = 0; i < 26; i++) {
    const mesh = new THREE.Mesh(
      shapeGeos[i % shapeGeos.length],
      new THREE.MeshStandardMaterial({
        color: ringColors[i % 3],
        emissive: ringColors[i % 3],
        emissiveIntensity: 0.35,
        metalness: 0.5,
        roughness: 0.3,
        wireframe: i % 3 === 0,
      })
    );
    mesh.position.set(
      THREE.MathUtils.randFloatSpread(22),
      THREE.MathUtils.randFloatSpread(40) - 8,
      THREE.MathUtils.randFloat(-8, 2)
    );
    mesh.userData = {
      rot: new THREE.Vector3(Math.random() * 0.02, Math.random() * 0.02, 0),
      floatOffset: Math.random() * Math.PI * 2,
      baseY: mesh.position.y,
    };
    scene.add(mesh);
    shapes.push(mesh);
  }

  // ---------- Starfield ----------
  const STAR_COUNT = window.innerWidth < 700 ? 1200 : 2600;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starColors = new Float32Array(STAR_COUNT * 3);
  const palette = [new THREE.Color(0x22d3ee), new THREE.Color(0x8b5cf6), new THREE.Color(0xec4899), new THREE.Color(0xffffff)];
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = THREE.MathUtils.randFloat(8, 60);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi) - 10;
    const c = palette[i % palette.length];
    starColors.set([c.r, c.g, c.b], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      map: makeDotTexture(),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(stars);

  // ---------- Interaction ----------
  const mouse = new THREE.Vector2();
  const target = new THREE.Vector2();
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let scrollProgress = 0;
  let heroProgress = 0; // 0 while on hero, 1 once scrolled one screen down
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
    heroProgress = Math.min(window.scrollY / window.innerHeight, 1);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Place core to the right of hero text on wide screens, centred & smaller on phones
  let coreBaseX = 0;
  let coreBaseY = 0;
  let coreBaseZ = 0;
  let coreScale = 1;
  const layout = () => {
    const w = window.innerWidth;
    camera.aspect = w / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(w, window.innerHeight);
    if (w > 1080) { coreBaseX = 3.4; coreBaseY = 0; coreBaseZ = 0; coreScale = 1; }
    else if (w > 820) { coreBaseX = 2.6; coreBaseY = 0; coreBaseZ = 0; coreScale = 0.85; }
    else { coreBaseX = 1.2; coreBaseY = 2.6; coreBaseZ = -6; coreScale = 0.8; }
  };
  window.addEventListener("resize", layout);
  layout();

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const tick = () => {
    const t = clock.getElapsedTime();
    const speed = reduceMotion ? 0.15 : 1;

    // smooth mouse follow
    target.lerp(mouse, 0.05);

    // Core: sits beside hero text, then recedes into the fog behind the content
    const sp = scrollProgress;
    const hp = THREE.MathUtils.smoothstep(heroProgress, 0, 1);
    core.position.x = coreBaseX * (1 + hp * 0.5);
    core.position.y = coreBaseY + Math.sin(t * 0.8) * 0.15 * speed + hp * 0.5;
    core.position.z = coreBaseZ - hp * 9;
    core.scale.setScalar(coreScale);
    const fade = 1 - hp * 0.7;
    coreMaterials.forEach(({ mat, base }) => { mat.opacity = base * fade; });
    core.rotation.y = t * 0.15 * speed + sp * Math.PI * 2 + target.x * 0.5;
    core.rotation.x = target.y * 0.4 + sp * Math.PI;

    inner.rotation.x = t * 0.3 * speed;
    inner.rotation.z = t * 0.2 * speed;
    inner.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
    shell.rotation.y = -t * 0.2 * speed;
    vertPoints.rotation.y = shell.rotation.y;

    rings.forEach((ring, i) => { ring.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1) * speed; });

    orbiters.forEach((o) => {
      const a = t * o.speed * speed + o.offset;
      o.sprite.position.set(Math.cos(a) * o.radius, Math.sin(a) * o.radius * o.tilt, Math.sin(a) * o.radius);
    });

    shapes.forEach((m) => {
      m.rotation.x += m.userData.rot.x * speed;
      m.rotation.y += m.userData.rot.y * speed;
      m.position.y = m.userData.baseY + Math.sin(t + m.userData.floatOffset) * 0.3 + sp * 30;
    });

    stars.rotation.y = t * 0.01 * speed + sp * 0.6;
    stars.rotation.x = sp * 0.3;

    // camera parallax
    camera.position.x += (target.x * 0.8 - camera.position.x) * 0.05;
    camera.position.y += (-target.y * 0.5 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    cyanLight.position.x = Math.sin(t * 0.5) * 6;
    pinkLight.position.y = Math.cos(t * 0.4) * 5;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
}

function makeLabelTexture(text, i) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const ctx = c.getContext("2d");
  const colors = ["#22d3ee", "#8b5cf6", "#ec4899"];
  const col = colors[i % 3];
  ctx.fillStyle = "rgba(11, 13, 31, 0.75)";
  roundRect(ctx, 8, 24, 240, 80, 22);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = col;
  ctx.stroke();
  ctx.font = "600 44px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = col;
  ctx.shadowBlur = 18;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeDotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
