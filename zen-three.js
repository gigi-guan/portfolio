import * as THREE from 'three';

const VIDEO_SRC = 'assets/the_video_should_not_have_any.mp4';
const STILL_SRC = 'assets/zen-garden.png';
const KOI_RAW = 'assets/koi-raw.mp4';
const RAKE_RES = 512;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const skyVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uBrightness;
  uniform float uSaturation;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    uv.x += sin(uv.y * 3.0 + uTime * 0.08) * 0.004;
    vec3 col = texture2D(uTexture, uv).rgb;
    col *= uBrightness;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, uSaturation);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const sandVertex = /* glsl */ `
  uniform sampler2D uRakeMap;
  uniform float uRakeStrength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vGroove;

  void main() {
    vUv = uv;
    float groove = texture2D(uRakeMap, uv).r;
    vGroove = groove;

    vec3 pos = position;
    float h = groove * uRakeStrength;
    pos.z += h;
    pos.y -= h * 0.35;

    vNormal = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const sandFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vGroove;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float grain = hash(vUv * 900.0) * 0.04;
    vec3 sandHi = vec3(0.88, 0.84, 0.76);
    vec3 sandLo = vec3(0.68, 0.63, 0.55);
    vec3 col = mix(sandHi, sandLo, vGroove * 0.85 + grain);

    vec3 lightDir = normalize(vec3(0.3, 0.9, 0.5));
    float diff = max(dot(vNormal, lightDir), 0.0);
    col *= 0.72 + diff * 0.38;

    float ripple = sin(vUv.x * 120.0 + uTime * 0.4) * 0.008;
    col += ripple * (1.0 - vGroove);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const koiVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const koiFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uKeyWhite;
  uniform vec3 uKeyColor;
  uniform float uKeyThreshold;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float alpha = tex.a;

    if (uKeyWhite > 0.5) {
      vec3 diff = tex.rgb - uKeyColor;
      float dist = length(diff);
      float maxC = max(max(tex.r, tex.g), tex.b);
      float minC = min(min(tex.r, tex.g), tex.b);
      float sat = maxC - minC;
      alpha = smoothstep(uKeyThreshold, uKeyThreshold + 0.16, dist);
      alpha = mix(alpha, 1.0, smoothstep(0.04, 0.28, sat));
      alpha *= 1.0 - smoothstep(0.82, 0.97, min(tex.r, min(tex.g, tex.b)));
      float edge = 1.0 - alpha;
      tex.rgb -= uKeyColor * edge * 0.28;
      tex.rgb += uKeyColor * edge * 0.34;
    }

    if (alpha < 0.04) discard;
    gl_FragColor = vec4(tex.rgb, alpha * uOpacity);
  }
`;

class KaresansuiScene {
  constructor(container, fallback) {
    this.container = container;
    this.fallback = fallback;
    this.mouse = { x: 0, y: 0, ndc: new THREE.Vector2() };
    this.koiTarget = new THREE.Vector3(0, -0.38, 0.65);
    this.scroll = 0;
    this.scrollProgress = 0;
    this.isRaking = false;
    this.lastRakeUv = null;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.stones = [];
    this.koi = null;
    this.koiVideoTex = null;

    this.initRakeCanvas();
    this.init();
    this.bindEvents();
    this.animate();
    this.createKoi();
  }

  initRakeCanvas() {
    this.rakeCanvas = document.createElement('canvas');
    this.rakeCanvas.width = RAKE_RES;
    this.rakeCanvas.height = RAKE_RES;
    this.rakeCtx = this.rakeCanvas.getContext('2d');
    this.rakeCtx.fillStyle = '#000';
    this.rakeCtx.fillRect(0, 0, RAKE_RES, RAKE_RES);

    this.rakeTexture = new THREE.CanvasTexture(this.rakeCanvas);
    this.rakeTexture.minFilter = THREE.LinearFilter;
    this.rakeTexture.magFilter = THREE.LinearFilter;
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0c0e, 0.18);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    this.baseCameraPos = new THREE.Vector3(0, 0.35, 3.2);
    this.baseCameraLook = new THREE.Vector3(0, -0.15, 0);
    this.camera.position.copy(this.baseCameraPos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x080a0c, 1);
    this.container.appendChild(this.renderer.domElement);

    const loader = new THREE.TextureLoader();
    const stillTex = loader.load(STILL_SRC);
    stillTex.colorSpace = THREE.SRGBColorSpace;

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: stillTex },
        uBrightness: { value: 0.55 },
        uSaturation: { value: 0.58 },
        uTime: { value: 0 }
      },
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      depthWrite: false
    });

    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), this.skyMat);
    this.sky.position.set(0, 0.55, -2.8);
    this.scene.add(this.sky);

    this.sandMat = new THREE.ShaderMaterial({
      uniforms: {
        uRakeMap: { value: this.rakeTexture },
        uRakeStrength: { value: 0.14 },
        uTime: { value: 0 }
      },
      vertexShader: sandVertex,
      fragmentShader: sandFragment,
      side: THREE.DoubleSide
    });

    this.sand = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 3.2, 128, 96),
      this.sandMat
    );
    this.sand.rotation.x = -Math.PI * 0.38;
    this.sand.position.set(0.15, -0.55, 0.2);
    this.scene.add(this.sand);

    this.createStones();
    this.loadSkyVideo();
    this.resize();
  }

  createStones() {
    const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x4a4844,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true
    });

    const placements = [
      { pos: [-1.4, -0.05, 0.35], scale: 0.22, rot: 0.3 },
      { pos: [1.55, -0.12, 0.28], scale: 0.28, rot: -0.5 },
      { pos: [-0.5, -0.2, 0.55], scale: 0.16, rot: 1.1 },
      { pos: [0.9, -0.18, 0.48], scale: 0.19, rot: 0.8 }
    ];

    this.stones = placements.map((p) => {
      const mesh = new THREE.Mesh(stoneGeo, stoneMat.clone());
      mesh.position.set(...p.pos);
      mesh.scale.setScalar(p.scale);
      mesh.rotation.set(p.rot, p.rot * 1.3, p.rot * 0.7);
      mesh.userData.baseY = p.pos[1];
      this.scene.add(mesh);
      return mesh;
    });

    const amb = new THREE.AmbientLight(0xc8c0b0, 0.55);
    const dir = new THREE.DirectionalLight(0xfff5e8, 0.65);
    dir.position.set(2, 4, 3);
    this.scene.add(amb, dir);
  }

  getKoiXRange() {
    const koiZ = 0.65;
    const dist = Math.max(this.camera.position.z - koiZ, 0.5);
    const vFov = (this.camera.fov * Math.PI) / 180;
    const visibleH = 2 * Math.tan(vFov / 2) * dist;
    return visibleH * this.camera.aspect * 0.42;
  }

  getKoiYRange() {
    const koiZ = 0.65;
    const dist = Math.max(this.camera.position.z - koiZ, 0.5);
    const vFov = (this.camera.fov * Math.PI) / 180;
    const visibleH = 2 * Math.tan(vFov / 2) * dist;
    return visibleH * 0.24;
  }

  updateKoiTargetFromPointer(clientX, clientY) {
    if (!this.koi) return;

    const px = THREE.MathUtils.clamp(clientX / window.innerWidth, 0, 1);
    const py = THREE.MathUtils.clamp(clientY / window.innerHeight, 0, 1);
    const xRange = this.koi.def.xRange * 1.55;
    const yRange = this.getKoiYRange();

    this.koiTarget.x = THREE.MathUtils.lerp(-xRange, xRange, px);
    this.koiTarget.y = THREE.MathUtils.lerp(
      this.koi.def.baseY + yRange,
      this.koi.def.baseY - yRange,
      py
    );
    this.koiTarget.z = this.koi.def.z;
  }

  loadSkyVideo() {
    const video = document.createElement('video');
    video.src = VIDEO_SRC;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px';
    document.body.appendChild(video);
    this.skyVideo = video;

    const onReady = () => {
      const tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      this.skyMat.uniforms.uTexture.value = tex;
      this.videoTex = tex;
      if (this.fallback) this.fallback.style.opacity = '0';
      video.play().catch(() => {});
    };

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('error', () => {
      if (this.fallback) this.fallback.style.opacity = '1';
    }, { once: true });
    video.load();
  }

  createKoi() {
    const video = document.createElement('video');
    video.src = KOI_RAW;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px';
    document.body.appendChild(video);
    this.koiVideo = video;

    const onReady = () => {
      if (!video.videoWidth) return;

      const tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      this.koiVideoTex = tex;

      const aspect = video.videoWidth / video.videoHeight;
      const def = {
        baseY: -0.38,
        z: 0.65,
        scale: 0.34,
        cycleDuration: 14,
        xRange: this.getKoiXRange(),
        yWobble: 0.028,
        basePlaybackRate: 0.5,
        chaseSpeed: 3.8
      };

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: tex },
          uOpacity: { value: 0.92 },
          uKeyWhite: { value: 1 },
          uKeyColor: { value: new THREE.Vector3(1, 1, 1) },
          uKeyThreshold: { value: 0.08 }
        },
        vertexShader: koiVertex,
        fragmentShader: koiFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(def.scale * aspect, def.scale),
        mat
      );
      mesh.rotation.x = -0.2;
      mesh.renderOrder = 20;
      mesh.position.set(0, def.baseY, def.z);
      this.scene.add(mesh);

      this.koiTarget.set(0, def.baseY, def.z);
      this.koi = {
        mesh,
        def,
        travel: 0,
        velocity: new THREE.Vector3(),
        heading: 1
      };
      video.playbackRate = def.basePlaybackRate;
      video.play().catch(() => {});
    };

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('error', () => {
      console.warn('Koi video failed to load:', KOI_RAW);
    }, { once: true });
    video.load();
  }

  updateKoi(t, dt) {
    if (!this.koi) return;
    if (this.koiVideoTex) this.koiVideoTex.needsUpdate = true;

    const { mesh, def } = this.koi;
    const boost = this.isRaking ? 1.2 : 1;
    this.koi.travel += dt * boost;

    const wobbleY =
      Math.sin(this.koi.travel * 0.9) * def.yWobble * 0.04 +
      Math.cos(this.koi.travel * 0.5) * def.yWobble * 0.02;

    const liveXRange = def.xRange * 2.1;
    const liveYRange = this.getKoiYRange() * 1.15;
    const desired = new THREE.Vector3(
      THREE.MathUtils.clamp(this.mouse.x * liveXRange, -liveXRange, liveXRange),
      THREE.MathUtils.clamp(
        def.baseY + this.mouse.y * liveYRange + wobbleY,
        def.baseY - liveYRange,
        def.baseY + liveYRange
      ),
      def.z
    );

    const previousPosition = mesh.position.clone();
    mesh.position.x = desired.x;
    mesh.position.y = desired.y;
    mesh.position.z = desired.z;
    const distanceToTarget = mesh.position.distanceTo(desired);
    this.koi.velocity.copy(mesh.position).sub(previousPosition);

    const driftX = this.koi.velocity.x;
    if (Math.abs(driftX) > 0.0004) {
      this.koi.heading = driftX >= 0 ? 1 : -1;
    }
    mesh.rotation.z = THREE.MathUtils.clamp(driftX * 0.28, -0.34, 0.34);
    mesh.scale.x = this.koi.heading;
    mesh.scale.y = 1;

    if (this.koiVideo) {
      const chaseBoost = THREE.MathUtils.clamp(distanceToTarget * 0.18, 0, 0.14);
      this.koiVideo.playbackRate = def.basePlaybackRate + chaseBoost;
    }

    mesh.material.uniforms.uOpacity.value = 0.86 + Math.sin(t * 0.5) * 0.05;
  }

  intersectSand(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse.ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.sand);
    if (hits.length) return hits[0];
    return null;
  }

  uvFromEvent(clientX, clientY) {
    const hit = this.intersectSand(clientX, clientY);
    if (hit) return hit.uv.clone();
    return null;
  }

  rakeAt(uv, pressure = 1) {
    if (!uv) return;
    const x = uv.x * RAKE_RES;
    const y = (1 - uv.y) * RAKE_RES;
    const ctx = this.rakeCtx;
    const brush = 5 + pressure * 4;

    ctx.strokeStyle = `rgba(255,255,255,${0.35 + pressure * 0.25})`;
    ctx.lineWidth = brush;
    ctx.lineCap = 'round';

    if (this.lastRakeUv) {
      const lx = this.lastRakeUv.x * RAKE_RES;
      const ly = (1 - this.lastRakeUv.y) * RAKE_RES;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(x, y);
      ctx.stroke();

      const tines = 4;
      for (let i = 0; i < tines; i += 1) {
        const off = (i - (tines - 1) / 2) * 2.2;
        ctx.beginPath();
        ctx.moveTo(lx + off, ly);
        ctx.lineTo(x + off, y);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(x, y, brush * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }

    this.lastRakeUv = uv;
    this.rakeTexture.needsUpdate = true;
    this.container.dispatchEvent(new CustomEvent('sand-raked'));
  }

  fadeRakeTrails() {
    this.rakeCtx.globalCompositeOperation = 'destination-out';
    this.rakeCtx.fillStyle = 'rgba(0,0,0,0.012)';
    this.rakeCtx.fillRect(0, 0, RAKE_RES, RAKE_RES);
    this.rakeCtx.globalCompositeOperation = 'source-over';
    this.rakeTexture.needsUpdate = true;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('scroll', () => {
      this.scroll = window.scrollY;
      const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      this.scrollProgress = this.scroll / max;
    }, { passive: true });

    const onMove = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      this.updateKoiTargetFromPointer(e.clientX, e.clientY);
      const hit = this.intersectSand(e.clientX, e.clientY);
      const uv = hit?.uv || null;
      if (this.isRaking) {
        this.rakeAt(uv, 1);
      }
    };

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.isRaking = true;
      this.lastRakeUv = null;
      this.renderer.domElement.setPointerCapture(e.pointerId);
      this.updateKoiTargetFromPointer(e.clientX, e.clientY);
      const uv = this.uvFromEvent(e.clientX, e.clientY);
      this.rakeAt(uv, 0.8);
      document.body.classList.add('is-raking');
    });

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });

    const endRake = () => {
      this.isRaking = false;
      this.lastRakeUv = null;
      document.body.classList.remove('is-raking');
    };

    window.addEventListener('pointerup', endRake);
    window.addEventListener('pointercancel', endRake);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);

    if (this.koi) {
      this.koi.def.xRange = this.getKoiXRange();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const t = this.clock.getElapsedTime();
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.videoTex) this.videoTex.needsUpdate = true;

    this.fadeRakeTrails();

    if (this.skyMat) this.skyMat.uniforms.uTime.value = t;
    if (this.sandMat) this.sandMat.uniforms.uTime.value = t;

    const sp = this.scrollProgress;
    const camX = Math.sin(sp * Math.PI * 2) * 0.25;
    const camY = this.baseCameraPos.y - sp * 0.55;
    const camZ = this.baseCameraPos.z - sp * 0.4;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(
      this.baseCameraLook.x,
      this.baseCameraLook.y - sp * 0.35,
      this.baseCameraLook.z
    );

    if (this.sand) {
      this.sand.position.x = 0.15;
      this.sand.position.y = -0.55 - sp * 0.15;
    }

    this.stones.forEach((stone, i) => {
      stone.rotation.y = t * 0.02 * (i % 2 === 0 ? 1 : -1) + stone.rotation.x;
      stone.position.y = stone.userData.baseY + Math.sin(t * 0.5 + i) * 0.003;
    });

    this.updateKoi(t, dt);

    this.renderer.render(this.scene, this.camera);
  }
}

function init() {
  const root = document.getElementById('zen-three-root');
  const fallback = document.querySelector('.zen-bg-fallback');

  if (prefersReducedMotion.matches) {
    if (root) root.style.display = 'none';
    if (fallback) fallback.style.opacity = '1';
    return;
  }

  if (fallback) fallback.style.opacity = '1';

  if (root) {
    try {
      window.zenGarden = new KaresansuiScene(root, fallback);
    } catch (err) {
      console.error('Zen garden failed:', err);
      if (fallback) fallback.style.opacity = '1';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
