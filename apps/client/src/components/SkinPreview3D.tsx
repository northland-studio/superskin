import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import styles from './SkinPreview3D.module.css';

interface SkinPreview3DProps {
  skinUrl: string | null;
  width?: number;
  height?: number;
  animate?: boolean;
}

type UV = [number, number, number, number];

interface FaceUV {
  uv: UV;
}

interface CubeFaces {
  north?: FaceUV;
  east?: FaceUV;
  south?: FaceUV;
  west?: FaceUV;
  up?: FaceUV;
  down?: FaceUV;
}

interface CubeDef {
  position: [number, number, number];
  size: [number, number, number];
  origin?: [number, number, number];
  rotation?: [number, number, number];
  faces: CubeFaces;
}

const TW = 64;
const TH = 64;

const FACE_ORDER: string[] = ['east', 'west', 'up', 'down', 'south', 'north'];

const STEVE_CUBES: CubeDef[] = [
  {
    position: [-4, 24, -4],
    size: [8, 8, 8],
    rotation: [0, 18, 0],
    faces: {
      north: { uv: [8, 8, 16, 16] },
      east: { uv: [0, 8, 8, 16] },
      south: { uv: [24, 8, 32, 16] },
      west: { uv: [16, 8, 24, 16] },
      up: { uv: [16, 8, 8, 0] },
      down: { uv: [24, 0, 16, 8] },
    },
  },
  {
    position: [-4.5, 23.5, -4.5],
    size: [9, 9, 9],
    rotation: [0, 18, 0],
    faces: {
      north: { uv: [40, 8, 48, 16] },
      east: { uv: [32, 8, 40, 16] },
      south: { uv: [56, 8, 64, 16] },
      west: { uv: [48, 8, 56, 16] },
      up: { uv: [48, 8, 40, 0] },
      down: { uv: [56, 0, 48, 8] },
    },
  },
  {
    position: [-4, 12, -2],
    size: [8, 12, 4],
    faces: {
      north: { uv: [20, 20, 28, 32] },
      east: { uv: [16, 20, 20, 32] },
      south: { uv: [32, 20, 40, 32] },
      west: { uv: [28, 20, 32, 32] },
      up: { uv: [28, 20, 20, 16] },
      down: { uv: [36, 16, 28, 20] },
    },
  },
  {
    position: [-4.25, 11.75, -2.25],
    size: [8.5, 12.5, 4.5],
    faces: {
      north: { uv: [20, 36, 28, 48] },
      east: { uv: [16, 36, 20, 48] },
      south: { uv: [32, 36, 40, 48] },
      west: { uv: [28, 36, 32, 48] },
      up: { uv: [28, 36, 20, 32] },
      down: { uv: [36, 32, 28, 36] },
    },
  },
  {
    position: [4, 12, -2],
    size: [4, 12, 4],
    origin: [5, 22, 0],
    rotation: [-1, 0, 3],
    faces: {
      north: { uv: [44, 20, 48, 32] },
      east: { uv: [40, 20, 44, 32] },
      south: { uv: [52, 20, 56, 32] },
      west: { uv: [48, 20, 52, 32] },
      up: { uv: [48, 20, 44, 16] },
      down: { uv: [52, 16, 48, 20] },
    },
  },
  {
    position: [3.75, 11.75, -2.25],
    size: [4.5, 12.5, 4.5],
    origin: [5, 22, 0],
    rotation: [-1, 0, 3],
    faces: {
      north: { uv: [44, 36, 48, 48] },
      east: { uv: [40, 36, 44, 48] },
      south: { uv: [52, 36, 56, 48] },
      west: { uv: [48, 36, 52, 48] },
      up: { uv: [48, 36, 44, 32] },
      down: { uv: [52, 32, 48, 36] },
    },
  },
  {
    position: [-8, 12, -2],
    size: [4, 12, 4],
    origin: [-5, 22, 0],
    rotation: [1, 0, -3],
    faces: {
      north: { uv: [36, 52, 40, 64] },
      east: { uv: [32, 52, 36, 64] },
      south: { uv: [44, 52, 48, 64] },
      west: { uv: [40, 52, 44, 64] },
      up: { uv: [40, 52, 36, 48] },
      down: { uv: [44, 48, 40, 52] },
    },
  },
  {
    position: [-8.25, 11.75, -2.25],
    size: [4.5, 12.5, 4.5],
    origin: [-5, 22, 0],
    rotation: [1, 0, -3],
    faces: {
      north: { uv: [52, 52, 56, 64] },
      east: { uv: [48, 52, 52, 64] },
      south: { uv: [60, 52, 64, 64] },
      west: { uv: [56, 52, 60, 64] },
      up: { uv: [56, 52, 52, 48] },
      down: { uv: [60, 48, 56, 52] },
    },
  },
  {
    position: [-0.1, 0, -2],
    size: [4, 12, 4],
    faces: {
      north: { uv: [4, 20, 8, 32] },
      east: { uv: [0, 20, 4, 32] },
      south: { uv: [12, 20, 16, 32] },
      west: { uv: [8, 20, 12, 32] },
      up: { uv: [8, 20, 4, 16] },
      down: { uv: [12, 16, 8, 20] },
    },
  },
  {
    position: [-0.35, -0.25, -2.25],
    size: [4.5, 12.5, 4.5],
    faces: {
      north: { uv: [4, 36, 8, 48] },
      east: { uv: [0, 36, 4, 48] },
      south: { uv: [12, 36, 16, 48] },
      west: { uv: [8, 36, 12, 48] },
      up: { uv: [8, 36, 4, 32] },
      down: { uv: [12, 32, 8, 36] },
    },
  },
  {
    position: [-3.9, 0, -2],
    size: [4, 12, 4],
    faces: {
      north: { uv: [20, 52, 24, 64] },
      east: { uv: [16, 52, 20, 64] },
      south: { uv: [28, 52, 32, 64] },
      west: { uv: [24, 52, 28, 64] },
      up: { uv: [24, 52, 20, 48] },
      down: { uv: [28, 48, 24, 52] },
    },
  },
  {
    position: [-4.15, -0.25, -2.25],
    size: [4.5, 12.5, 4.5],
    faces: {
      north: { uv: [4, 52, 8, 64] },
      east: { uv: [0, 52, 4, 64] },
      south: { uv: [12, 52, 16, 64] },
      west: { uv: [8, 52, 12, 64] },
      up: { uv: [8, 52, 4, 48] },
      down: { uv: [12, 48, 8, 52] },
    },
  },
];

function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

interface BuildResult {
  mesh: THREE.Mesh;
  pivot: [number, number, number];
}

function buildCubeMesh(def: CubeDef, material: THREE.Material): BuildResult {
  const geo = new THREE.BoxGeometry(def.size[0], def.size[1], def.size[2]);

  const pivot: [number, number, number] = def.origin
    ? [def.origin[0], def.origin[1], def.origin[2]]
    : [
        def.position[0] + def.size[0] / 2,
        def.position[1] + def.size[1] / 2,
        def.position[2] + def.size[2] / 2,
      ];

  geo.translate(-pivot[0], -pivot[1], -pivot[2]);
  geo.translate(
    def.position[0] + def.size[0] / 2,
    def.position[1] + def.size[1] / 2,
    def.position[2] + def.size[2] / 2
  );

  const uvArr = geo.getAttribute('uv') as THREE.BufferAttribute;
  const arr = uvArr.array as Float32Array;

  FACE_ORDER.forEach((fkey, i) => {
    const face = def.faces[fkey as keyof CubeFaces];
    if (!face) return;
    const [u1, v1, u2, v2] = face.uv;
    const uvData = [
      u1 / TW, 1 - v1 / TH,
      u2 / TW, 1 - v1 / TH,
      u1 / TW, 1 - v2 / TH,
      u2 / TW, 1 - v2 / TH,
    ];
    const base = i * 8;
    for (let j = 0; j < 8; j++) {
      arr[base + j] = uvData[j];
    }
  });
  uvArr.needsUpdate = true;

  const mesh = new THREE.Mesh(geo, material);
  const initRotation: [number, number, number] | undefined = def.rotation
    ? [degToRad(def.rotation[0]), degToRad(def.rotation[1]), degToRad(def.rotation[2])]
    : undefined;

  if (initRotation) {
    mesh.rotation.set(initRotation[0], initRotation[1], initRotation[2]);
  }

  return { mesh, pivot };
}

const ANIM_MAP: Record<string, number> = {
  0: 0, 1: 0,
  4: 1, 5: 1,
  6: 2, 7: 2,
  8: 3, 9: 3,
  10: 4, 11: 4,
};

function SkinModel({ texture, animate }: { texture: THREE.Texture; animate: boolean }) {
  const armRefR = useRef<THREE.Group>(null);
  const armRefL = useRef<THREE.Group>(null);
  const legRefR = useRef<THREE.Group>(null);
  const legRefL = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const refsByAnimIdx = useMemo(() => [headRef, armRefR, armRefL, legRefR, legRefL], []);

  const material = useMemo(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.05,
      side: THREE.FrontSide,
    });
  }, [texture]);

  const results = useMemo(
    () => STEVE_CUBES.map((def) => buildCubeMesh(def, material)),
    [material]
  );

  useFrame(() => {
    if (!animate) return;
    const t = performance.now() * 0.004;
    const swing = Math.sin(t) * 0.6;
    if (armRefR.current) armRefR.current.rotation.x = swing;
    if (armRefL.current) armRefL.current.rotation.x = -swing;
    if (legRefR.current) legRefR.current.rotation.x = -swing;
    if (legRefL.current) legRefL.current.rotation.x = swing;
  });

  return (
    <group scale={[0.9375, 0.9375, 0.9375]}>
      {results.map(({ mesh, pivot }, i) => {
        const animIdx = ANIM_MAP[i];
        if (animIdx !== undefined) {
          return (
            <group key={i} ref={refsByAnimIdx[animIdx]} position={pivot}>
              <primitive object={mesh} />
            </group>
          );
        }
        return (
          <group key={i} position={pivot}>
            <primitive object={mesh} />
          </group>
        );
      })}
    </group>
  );
}

function SceneContent({ skinUrl, animate }: { skinUrl: string; animate: boolean }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      skinUrl,
      (t) => {
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        setTex(t);
      },
      undefined,
      () => console.error('Failed to load skin texture')
    );
  }, [skinUrl]);

  if (!tex) return null;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 100, 0]} intensity={0.46} />
      <directionalLight position={[0, -100, 0]} intensity={-0.02} />
      <directionalLight position={[0, 0, 100]} intensity={0.3} />
      <directionalLight position={[0, 0, -100]} intensity={0.3} />
      <directionalLight position={[-100, 0, 0]} intensity={0.1} />
      <directionalLight position={[100, 0, 0]} intensity={0.1} />
      <SkinModel texture={tex} animate={animate} />
      <OrbitControls
        enablePan={false}
        minDistance={25}
        maxDistance={120}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
    </>
  );
}

export function SkinPreview3D({
  skinUrl,
  width = 400,
  height = 500,
  animate = true,
}: SkinPreview3DProps) {
  if (!skinUrl) {
    return (
      <div className={styles.container} style={{ width, height }}>
        <div className={styles.placeholder}>
          <span>上传皮肤后预览</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ width, height }}>
      <Canvas
        camera={{ position: [35, 28, 35], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: false }}
      >
        <SceneContent skinUrl={skinUrl} animate={animate} />
      </Canvas>
      <div className={styles.hint}>拖拽旋转 · 滚轮缩放</div>
    </div>
  );
}

export default SkinPreview3D;
