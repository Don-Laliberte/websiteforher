"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type GardenSceneProps = {
  celebrating: boolean;
  /** Fired once when all GLBs are ready (for white-veil fade). */
  onReady?: () => void;
  /** Skip the pink loader — parent covers load with a white veil. */
  quietLoader?: boolean;
};

const HEART_URLS = [
  "/models/hearts/black_heart.glb",
  "/models/hearts/heart_with_arrow.glb",
  "/models/hearts/heart_emoji-2.glb",
  "/models/hearts/heart_emoji.glb",
] as const;

type ModelBundle = {
  bedroom: THREE.Group | null;
  melody: THREE.Group | null;
  car: THREE.Group | null;
  hearts: THREE.Group[];
  lily: THREE.Group | null;
  chiikawa: THREE.Group | null;
  progress: number;
  error: string | null;
};

const ModelsContext = createContext<ModelBundle>({
  bedroom: null,
  melody: null,
  car: null,
  hearts: [],
  lily: null,
  chiikawa: null,
  progress: 0,
  error: null,
});

function fitOnFloor(object: THREE.Object3D, targetSize: number) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  object.scale.setScalar(targetSize / maxDim);

  box.setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
}

/** Scale so longest axis ≈ targetSize and center the bbox on the origin. */
function fitCentered(object: THREE.Object3D, targetSize: number) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  object.scale.multiplyScalar(targetSize / maxDim);
  box.setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.y -= center.y;
  object.position.z -= center.z;
}

type GltfSpecularGlossiness = {
  diffuseFactor?: [number, number, number, number];
  glossinessFactor?: number;
};

function applySpecularGlossinessColors(gltf: {
  scene: THREE.Group;
  parser: { json: {
    materials?: Array<{
      name?: string;
      extensions?: { KHR_materials_pbrSpecularGlossiness?: GltfSpecularGlossiness };
    }>;
  }};
}) {
  // three@0.186 dropped KHR_materials_pbrSpecularGlossiness — restore authored colors by name
  const defs = gltf.parser.json.materials;
  if (!defs?.length) return;

  const byName = new Map<string, { color: THREE.Color; roughness: number }>();
  for (const def of defs) {
    const sg = def.extensions?.KHR_materials_pbrSpecularGlossiness;
    if (!def.name || !sg?.diffuseFactor) continue;
    const [r, g, b] = sg.diffuseFactor;
    byName.set(def.name, {
      color: new THREE.Color(r, g, b),
      roughness: 1 - (sg.glossinessFactor ?? 0.5),
    });
  }
  if (byName.size === 0) return;

  gltf.scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mats = Array.isArray((child as THREE.Mesh).material)
      ? ((child as THREE.Mesh).material as THREE.Material[])
      : [(child as THREE.Mesh).material as THREE.Material];
    for (const mat of mats) {
      if (!mat?.name) continue;
      const authored = byName.get(mat.name);
      if (!authored) continue;
      const lit = mat as THREE.MeshStandardMaterial;
      if (lit.color) lit.color.copy(authored.color);
      if ("metalness" in lit) lit.metalness = 0;
      if ("roughness" in lit) lit.roughness = authored.roughness;
      lit.needsUpdate = true;
    }
  });
}

function loadGlb(url: string, options: { unlit?: boolean } = {}) {
  const { unlit = true } = options;
  return new Promise<THREE.Group>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        applySpecularGlossinessColors(gltf);
        const root = gltf.scene;
        root.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const mesh = child as THREE.Mesh;
          mesh.castShadow = false;
          mesh.receiveShadow = true;

          if (!unlit) {
            // Keep authored PBR (F1 paint/chrome) under the room lights
            const mats = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            mats.forEach((mat) => {
              if (!mat) return;
              const std = mat as THREE.MeshStandardMaterial;
              if (std.map) {
                std.map.colorSpace = THREE.SRGBColorSpace;
                std.map.needsUpdate = true;
              }
              std.needsUpdate = true;
            });
            return;
          }

          // Pastel PBR maps/colors clip under lights — show authored colors unlit
          const incoming = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];

          const next = incoming.map((mat) => {
            if (!mat) return mat;
            const src = mat as THREE.MeshStandardMaterial;
            const map = src.map ?? null;
            const basic = new THREE.MeshBasicMaterial({
              map,
              color: map ? 0xffffff : (src.color?.getHex() ?? 0xffffff),
              transparent: src.transparent,
              opacity: src.opacity,
              alphaTest: src.alphaTest,
              side: src.side,
              alphaMap: src.alphaMap ?? null,
              depthWrite: src.depthWrite,
            });
            if (map) {
              map.colorSpace = THREE.SRGBColorSpace;
              map.needsUpdate = true;
            }
            basic.needsUpdate = true;
            return basic;
          });

          mesh.material = Array.isArray(mesh.material) ? next : next[0];
        });
        resolve(root);
      },
      undefined,
      (err) => reject(err),
    );
  });
}

function ModelsProvider({ children }: { children: ReactNode }) {
  const [bedroom, setBedroom] = useState<THREE.Group | null>(null);
  const [melody, setMelody] = useState<THREE.Group | null>(null);
  const [car, setCar] = useState<THREE.Group | null>(null);
  const [hearts, setHearts] = useState<THREE.Group[]>([]);
  const [lily, setLily] = useState<THREE.Group | null>(null);
  const [chiikawa, setChiikawa] = useState<THREE.Group | null>(null);
  const [progress, setProgress] = useState(8);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = window.setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 2));
    }, 160);

    (async () => {
      try {
        // Bedroom is the bulk (~16MB); fetch it first, then overlap the rest
        const room = await loadGlb(
          "/models/bedroom/pink_bedroom_miside.glb",
        );
        if (cancelled) return;
        setBedroom(room);
        setProgress(35);

        const [bunny, racer, heartModels, flower, crew] = await Promise.all([
          loadGlb("/models/mymelody/my_melody.glb"),
          loadGlb("/models/f1/f1_mercedes.glb", { unlit: false }),
          Promise.all(HEART_URLS.map((url) => loadGlb(url))),
          loadGlb("/models/lily/pink_lily.glb"),
          loadGlb("/models/chiikawa/chiikawa_crew.glb"),
        ]);
        if (cancelled) return;
        setMelody(bunny);
        setCar(racer);
        setHearts(heartModels);
        setLily(flower);
        setChiikawa(crew);
        setProgress(100);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError(e instanceof Error ? e.message : "Could not load 3D models");
      } finally {
        window.clearInterval(tick);
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, []);

  const value = useMemo(
    () => ({
      bedroom,
      melody,
      car,
      hearts,
      lily,
      chiikawa,
      progress,
      error,
    }),
    [bedroom, melody, car, hearts, lily, chiikawa, progress, error],
  );

  return (
    <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
  );
}

function fitTextureToAspect(
  texture: THREE.Texture,
  screenAspect: number,
  options: { flipX?: boolean; flipY?: boolean } = {},
) {
  const { flipX = false, flipY = false } = options;
  texture.colorSpace = THREE.SRGBColorSpace;
  // glTF UVs are bottom-left; flipY false matches that, then we mirror via repeat
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const image = texture.image as { width?: number; height?: number } | undefined;
  const imgW = image?.width ?? 1;
  const imgH = image?.height ?? 1;
  const imageAspect = imgW / imgH;

  let repeatX = 1;
  let repeatY = 1;
  let offsetX = 0;
  let offsetY = 0;
  if (imageAspect < screenAspect) {
    repeatY = imageAspect / screenAspect;
    offsetY = (1 - repeatY) / 2;
  } else {
    repeatX = screenAspect / imageAspect;
    offsetX = (1 - repeatX) / 2;
  }

  if (flipX) {
    offsetX = offsetX + repeatX;
    repeatX = -repeatX;
  }
  if (flipY) {
    offsetY = offsetY + repeatY;
    repeatY = -repeatY;
  }

  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(offsetX, offsetY);
  texture.needsUpdate = true;
}

function applyPhotoToMeshes(
  root: THREE.Object3D,
  texture: THREE.Texture,
  screenAspect: number,
  match: (id: string) => boolean,
  options: { flipX?: boolean; flipY?: boolean } = {},
) {
  fitTextureToAspect(texture, screenAspect, options);
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const matName = Array.isArray(mesh.material)
      ? ""
      : ((mesh.material as THREE.Material)?.name ?? "");
    const id = `${mesh.name} ${matName}`.toLowerCase();
    if (!match(id)) return;

    mesh.material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  });
}

function Bedroom() {
  const { bedroom } = useContext(ModelsContext);
  const photosApplied = useRef(false);

  const prepared = useMemo(() => {
    if (!bedroom) return null;
    if (!bedroom.userData.fitted) {
      fitOnFloor(bedroom, 8);
      bedroom.userData.fitted = true;
    }
    return bedroom;
  }, [bedroom]);

  useEffect(() => {
    if (!prepared || photosApplied.current) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();

    const loadPhoto = (url: string) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });

    (async () => {
      try {
        const [monitorTex, frameTex] = await Promise.all([
          loadPhoto("/images/monitor-wallpaper.jpg"),
          loadPhoto("/images/desk-frame.jpg"),
        ]);
        if (cancelled) return;

        // Desk PC screen — mirrored on X to match UV layout
        applyPhotoToMeshes(
          prepared,
          monitorTex,
          1.65,
          (id) => id.includes("blink006") || id.includes("monitorglass_3"),
          { flipX: true },
        );
        // Picture frame above the PC — mirrored on Y to match UV layout
        applyPhotoToMeshes(
          prepared,
          frameTex,
          0.38 / 0.35,
          (id) => id.includes("blink_2_"),
          { flipY: true },
        );
        photosApplied.current = true;
      } catch (err) {
        console.warn("Bedroom photo textures failed to load", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prepared]);

  if (!prepared) return null;
  return <primitive object={prepared} />;
}

function faceToward(object: THREE.Object3D, target: THREE.Vector3) {
  // Nose mesh marks true forward — this GLB does not face +Z at rest
  let noseMesh: THREE.Mesh | undefined;
  object.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh || noseMesh) return;
    const mesh = child as THREE.Mesh;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of list) {
      if (m && "color" in m && (m as THREE.MeshBasicMaterial).color?.getHex() === 0xe7d06b) {
        noseMesh = mesh;
        break;
      }
    }
  });

  object.rotation.y = 0;
  object.updateMatrixWorld(true);

  const center = new THREE.Vector3();
  let count = 0;
  object.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    center.add(child.getWorldPosition(new THREE.Vector3()));
    count += 1;
  });
  if (count > 0) center.multiplyScalar(1 / count);
  else object.getWorldPosition(center);

  const forward = new THREE.Vector3(1, 0, 0);
  if (noseMesh) {
    forward.copy(noseMesh.getWorldPosition(new THREE.Vector3())).sub(center);
    forward.y = 0;
    if (forward.lengthSq() > 1e-6) forward.normalize();
  }

  const toTarget = target.clone().sub(center);
  toTarget.y = 0;
  if (toTarget.lengthSq() < 1e-6) return;
  toTarget.normalize();

  object.rotation.y =
    Math.atan2(toTarget.x, toTarget.z) - Math.atan2(forward.x, forward.z);
}

function MyMelody({ celebrating }: { celebrating: boolean }) {
  const { melody } = useContext(ModelsContext);
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const hopPhase = useRef(0);
  const posed = useRef(false);

  const prepared = useMemo(() => {
    if (!melody) return null;
    if (!melody.userData.fitted) {
      fitOnFloor(melody, 0.85);
      melody.userData.floorY = melody.position.y;
      melody.userData.fitted = true;
    }
    return melody;
  }, [melody]);

  useFrame((_, delta) => {
    if (!prepared || !group.current) return;

    if (!posed.current && camera.position.x < -1.5) {
      // Right of the card on the rug, clear of the bed footboard
      prepared.position.x = 0.05;
      prepared.position.y = (prepared.userData.floorY ?? 0) + 0.08;
      prepared.position.z = 1.05;
      faceToward(prepared, camera.position);
      posed.current = true;
    }

    // Hop on the wrapper only — child already sits on the floor
    if (celebrating) {
      hopPhase.current += delta * 6;
      if (hopPhase.current < Math.PI) {
        group.current.position.y = Math.abs(Math.sin(hopPhase.current)) * 0.28;
      } else {
        group.current.position.y = Math.sin(hopPhase.current * 0.4) * 0.04;
      }
    } else {
      group.current.position.y = Math.sin(performance.now() * 0.002) * 0.03;
    }
  });

  if (!prepared) return null;

  return (
    <group ref={group}>
      <primitive object={prepared} />
    </group>
  );
}

function FallingHearts({ celebrating }: { celebrating: boolean }) {
  const { hearts } = useContext(ModelsContext);
  const count = 22;

  const particles = useMemo(() => {
    if (hearts.length === 0) return [];
    return Array.from({ length: count }, (_, i) => {
      const clone = hearts[i % hearts.length].clone(true);
      const size = 0.11 + Math.random() * 0.1;
      fitCentered(clone, size);
      // Wrapper holds fall pose so fitCentered offset on the clone stays intact
      const wrapper = new THREE.Group();
      wrapper.add(clone);
      return {
        object: wrapper,
        x: (Math.random() - 0.5) * 5,
        y: 1 + Math.random() * 2.5,
        z: (Math.random() - 0.5) * 4,
        speed: 0.1 + Math.random() * 0.22,
        spinX: (Math.random() - 0.5) * 1.1,
        spinY: (Math.random() - 0.5) * 1.4,
        sway: Math.random() * Math.PI * 2,
      };
    });
  }, [hearts]);

  useFrame((state) => {
    const burst = celebrating ? 1.8 : 1;
    const t = state.clock.elapsedTime;
    particles.forEach((p) => {
      p.y -= p.speed * 0.016 * burst;
      p.x += Math.sin(t + p.sway) * 0.002;
      if (p.y < 0.08) {
        p.y = 2.8 + Math.random();
        p.x = (Math.random() - 0.5) * 5;
        p.z = (Math.random() - 0.5) * 4;
      }
      p.object.position.set(p.x, p.y, p.z);
      p.object.rotation.set(t * p.spinX, t * p.spinY + p.sway, p.sway * 0.3);
      p.object.scale.setScalar(celebrating ? 1.2 : 1);
    });
  });

  if (particles.length === 0) return null;

  return (
    <group>
      {particles.map((p, i) => (
        <primitive key={i} object={p.object} />
      ))}
    </group>
  );
}

function LilyBurst({ celebrating }: { celebrating: boolean }) {
  const { lily } = useContext(ModelsContext);
  const celebratingSince = useRef<number | null>(null);
  const lastBurst = useRef(-1);
  const count = 14;
  const BURST_PERIOD = 5;

  const particles = useMemo(() => {
    if (!lily) return [];
    return Array.from({ length: count }, (_, i) => {
      const clone = lily.clone(true);
      fitCentered(clone, 0.28 + Math.random() * 0.12);
      const wrapper = new THREE.Group();
      wrapper.add(clone);

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const outward = 0.9 + Math.random() * 0.7;
      return {
        object: wrapper,
        vx: Math.cos(angle) * outward,
        vy: 2.0 + Math.random() * 0.9,
        vz: Math.sin(angle) * outward * 0.55,
        spinX: (Math.random() - 0.5) * 10,
        spinY: (Math.random() - 0.5) * 12,
        spinZ: (Math.random() - 0.5) * 10,
        delay: Math.random() * 0.25,
      };
    });
  }, [lily]);

  useFrame((state, delta) => {
    if (!celebrating) {
      celebratingSince.current = null;
      lastBurst.current = -1;
      return;
    }
    if (celebratingSince.current === null) {
      celebratingSince.current = state.clock.elapsedTime;
    }

    const cycleT = state.clock.elapsedTime - celebratingSince.current;
    const burstIndex = Math.floor(cycleT / BURST_PERIOD);
    const tInBurst = cycleT % BURST_PERIOD;

    // Reshuffle toss directions each time a burst restarts
    if (burstIndex !== lastBurst.current) {
      lastBurst.current = burstIndex;
      particles.forEach((p, i) => {
        const angle =
          (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const outward = 0.9 + Math.random() * 0.7;
        p.vx = Math.cos(angle) * outward;
        p.vy = 2.0 + Math.random() * 0.9;
        p.vz = Math.sin(angle) * outward * 0.55;
        p.spinX = (Math.random() - 0.5) * 10;
        p.spinY = (Math.random() - 0.5) * 12;
        p.spinZ = (Math.random() - 0.5) * 10;
        p.delay = Math.random() * 0.25;
        p.object.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        );
        p.object.visible = true;
      });
    }

    const gravity = 2.2;
    particles.forEach((p) => {
      const t = Math.max(0, tInBurst - p.delay);
      p.object.position.set(
        0.15 + p.vx * t,
        0.5 + p.vy * t - 0.5 * gravity * t * t,
        0.35 + p.vz * t,
      );
      p.object.rotation.x += p.spinX * delta;
      p.object.rotation.y += p.spinY * delta;
      p.object.rotation.z += p.spinZ * delta;
      p.object.visible = p.object.position.y > -0.35;
    });
  });

  if (!celebrating || particles.length === 0) return null;

  return (
    <group>
      {particles.map((p, i) => (
        <primitive key={i} object={p.object} />
      ))}
    </group>
  );
}

function RaceCar({ celebrating }: { celebrating: boolean }) {
  const { car } = useContext(ModelsContext);
  const group = useRef<THREE.Group>(null);

  const prepared = useMemo(() => {
    if (!car) return null;
    if (!car.userData.fitted) {
      fitOnFloor(car, 0.55);
      car.userData.fitted = true;
    }
    return car;
  }, [car]);

  useFrame((state) => {
    if (!group.current) return;
    const speed = celebrating ? 1.6 : 0.7;
    const t = state.clock.elapsedTime * speed;
    // Open floor in front of the PC chair, toward the room / camera (chair ≈ 3.2, -2.1)
    const cx = 1.25;
    const cz = -2.05;
    const radius = 0.4;
    const x = cx + Math.cos(t) * radius;
    const z = cz + Math.sin(t) * radius;
    group.current.position.set(x, 0.09, z);
    // Model faces +Z at rest — yaw from circle tangent
    const vx = -Math.sin(t) * radius;
    const vz = Math.cos(t) * radius;
    group.current.rotation.y = Math.atan2(vx, vz);
  });

  if (!prepared) return null;

  return (
    <group ref={group}>
      <primitive object={prepared} />
    </group>
  );
}

function BedroomCamera() {
  const { camera } = useThree();
  const { bedroom, melody } = useContext(ModelsContext);
  const framed = useRef(false);

  useEffect(() => {
    if (!bedroom || !melody || framed.current) return;

    const id = requestAnimationFrame(() => {
      const box = new THREE.Box3().setFromObject(bedroom);
      if (box.isEmpty()) return;

      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Square-on to the bed/window wall (+X); keep PC desk (-Z) at the edge
      camera.position.set(
        center.x - size.x * 0.34,
        Math.min(1.38, size.y * 0.27),
        center.z + size.z * 0.05,
      );
      camera.lookAt(center.x + size.x * 0.28, 0.72, center.z + size.z * 0.03);
      camera.updateProjectionMatrix();
      framed.current = true;
    });

    return () => cancelAnimationFrame(id);
  }, [camera, bedroom, melody]);

  return null;
}

function DeskChiikawa() {
  const { chiikawa } = useContext(ModelsContext);

  const prepared = useMemo(() => {
    if (!chiikawa) return null;
    if (!chiikawa.userData.fitted) {
      fitOnFloor(chiikawa, 0.36);
      // Sleep clock sits ~ (3.88, 1.07, -1.47); place the crew on the desk in front of it
      chiikawa.position.x = 2.7;
      chiikawa.position.z = -1.6;
      chiikawa.position.y += 0.97;
      // Face into the room (toward −X)
      chiikawa.rotation.y = Math.PI / 2;
      chiikawa.userData.fitted = true;
    }
    return chiikawa;
  }, [chiikawa]);

  if (!prepared) return null;
  return <primitive object={prepared} />;
}

function SceneContents({ celebrating }: { celebrating: boolean }) {
  return (
    <>
      <color attach="background" args={["#b87a94"]} />
      <ambientLight intensity={0.28} color="#ffffff" />
      <hemisphereLight args={["#ffd6e5", "#6e4454", 0.25]} />
      <directionalLight
        position={[3.2, 4.5, 2.2]}
        intensity={0.45}
        color="#ffffff"
      />
      <pointLight position={[-1.4, 2.1, 1.0]} intensity={0.12} color="#ffc8d8" />

      <BedroomCamera />
      <Bedroom />
      <DeskChiikawa />
      <MyMelody celebrating={celebrating} />
      <RaceCar celebrating={celebrating} />
      <FallingHearts celebrating={celebrating} />
      <LilyBurst celebrating={celebrating} />
    </>
  );
}

function LoaderOverlay({
  quiet,
  onReady,
}: {
  quiet?: boolean;
  onReady?: () => void;
}) {
  const { progress, error, bedroom, melody, car, hearts, lily, chiikawa } =
    useContext(ModelsContext);
  const ready = Boolean(
    bedroom && melody && car && hearts.length > 0 && lily && chiikawa,
  );
  const [hidden, setHidden] = useState(false);
  const notified = useRef(false);

  useEffect(() => {
    if (!ready || notified.current) return;
    notified.current = true;
    onReady?.();
    const t = window.setTimeout(() => setHidden(true), 280);
    return () => window.clearTimeout(t);
  }, [ready, onReady]);

  if (quiet || hidden) return null;

  return (
    <div className="garden-loader" aria-live="polite">
      <p>{error ? "Couldn’t load the room" : "Warming up Sunnie's room…"}</p>
      <div className="garden-loader-bar">
        <span style={{ width: `${Math.min(100, Math.round(progress))}%` }} />
      </div>
    </div>
  );
}

export default function GardenScene({
  celebrating,
  onReady,
  quietLoader = false,
}: GardenSceneProps) {
  return (
    <ModelsProvider>
      <div className="garden-canvas" aria-hidden="true">
        <Canvas
          camera={{ position: [-2.7, 1.38, 0.35], fov: 40, near: 0.05, far: 100 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: false,
            outputColorSpace: THREE.SRGBColorSpace,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.65,
          }}
        >
          <Suspense fallback={null}>
            <SceneContents celebrating={celebrating} />
          </Suspense>
        </Canvas>
        <LoaderOverlay quiet={quietLoader} onReady={onReady} />
      </div>
    </ModelsProvider>
  );
}
