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
  showControls?: boolean;
}

type UV = [number, number, number, number];

interface CubeDef {
  position: [number, number, number];
  size: [number, number, number];
  origin?: [number, number, number];
  rotation?: [number, number, number];
  faces: { north: UV; east: UV; south: UV; west: UV; up: UV; down: UV };
}

const STEVE_CUBES: CubeDef[] = [
  {
    position: [-4, 24, -4],
    size: [8, 8, 8],
    rotation: [0, 18, 0],
    faces: {
      north: [8, 8, 16, 16],
      east: [0, 8, 8, 16],
      south: [24, 8, 32, 16],
      west: [16, 8, 24, 16],
      up: [16, 8, 8, 0],
      down: [24, 0, 16, 8],
    },
  },
  {
    position: [-4.5, 23.5, -4.5],
    size: [9, 9, 9],
    rotation: [0, 18, 0],
    faces: {
      north: [40, 8, 48, 16],
      east: [32, 8, 40, 16],
      south: [56, 8, 64, 16],
      west: [48, 8, 56, 16],
      up: [48, 8, 40, 0],
      down: [56, 0, 48, 8],
    },
  },
  {
    position: [-4, 12, -2],
    size: [8, 12, 4],
    faces: {
      north: [20, 20, 28, 32],
      east: [16, 20, 20, 32],
      south: [32, 20, 40, 32],
      west: [28, 20, 32, 32],
      up: [28, 20, 20, 16],
      down: [36, 16, 28, 20],
    },
  },
  {
    position: [-4.25, 11.75, -2.25],
    size: [8.5, 12.5, 4.5],
    faces: {
      north: [20, 36, 28, 48],
      east: [16, 36, 20, 48],
      south: [32, 36, 40, 48],
      west: [28, 36, 32, 48],
      up: [28, 36, 20, 32],
      down: [36, 32, 28, 36],
    },
  },
  {
    position: [4, 12, -2],
    size: [4, 12, 4],
    origin: [5, 22, 0],
    rotation: [-1, 0, 3],
    faces: {
      north: [44, 20, 48, 32],
      east: [40, 20, 44, 32],
      south: [52, 20, 56, 32],
      west: [48, 20, 52, 32],
      up: [48, 20, 44, 16],
      down: [52, 16, 48, 20],
    },
  },
  {
    position: [3.75, 11.75, -2.25],
    size: [4.5, 12.5, 4.5],
    origin: [5, 22, 0],
    rotation: [-1, 0, 3],
    faces: {
      north: [44, 36, 48, 48],
      east: [40, 36, 44, 48],
      south: [52, 36, 56, 48],
      west: [48, 36, 52, 48],
      up: [48, 36, 44, 32],
      down: [52, 32, 48, 36],
    },
  },
  {
    position: [-8, 12, -2],
    size: [4, 12, 4],
    origin: [-5, 22, 0],
    rotation: [1, 0, -3],
    faces: {
      north: [36, 52, 40, 64],
      east: [32, 52, 36, 64],
      south: [44, 52, 48, 64],
      west: [40, 52, 44, 64],
      up: [40, 52, 36, 48],
      down: [44, 48, 40, 52],
    },
  },
  {
    position: [-8.25, 11.75, -2.25],
    size: [4.5, 12.5, 4.5],
    origin: [-5, 22, 0],
    rotation: [1, 0, -3],
    faces: {
      north: [52, 52, 56, 64],
      east: [48, 52, 52, 64],
      south: [60, 52, 64, 64],
      west: [56, 52, 60, 64],
      up: [56, 52, 52, 48],
      down: [60, 48, 56, 52],
    },
  },
  {
    position: [0, 0, -2],
    size: [4, 12, 4],
    origin: [2, 12, 0],
    rotation: [0, 0, 0],
    faces: {
      north: [4, 20, 8, 32],
      east: [0, 20, 4, 32],
      south: [12, 20, 16, 32],
      west: [8, 20, 12, 32],
      up: [8, 20, 4, 16],
      down: [12, 16, 8, 20],
    },
  },
  {
    position: [-0.25, -0.25, -2.25],
    size: [4.5, 12.5, 4.5],
    origin: [2, 12, 0],
    rotation: [0, 0, 0],
    faces: {
      north: [4, 36, 8, 48],
      east: [0, 36, 4, 48],
      south: [12, 36, 16, 48],
      west: [8, 36, 12, 48],
      up: [8, 36, 4, 32],
      down: [12, 32, 8, 36],
    },
  },
  {
    position: [-4, 0, -2],
    size: [4, 12, 4],
    origin: [-2, 12, 0],
    rotation: [0, 0, 0],
    faces: {
      north: [20, 52, 24, 64],
      east: [16, 52, 20, 64],
      south: [28, 52, 32, 64],
      west: [24, 52, 28, 64],
      up: [24, 52, 20, 48],
      down: [28, 48, 24, 52],
    },
  },
  {
    position: [-4.25, -0.25, -2.25],
    size: [4.5, 12.5, 4.5],
    origin: [-2, 12, 0],
    rotation: [0, 0, 0],
    faces: {
      north: [4, 52, 8, 64],
      east: [0, 52, 4, 64],
      south: [12, 52, 16, 64],
      west: [8, 52, 12, 64],
      up: [8, 52, 4, 48],
      down: [12, 48, 8, 52],
    },
  },
];

const FACE_ORDER: Record<string, number> = { east: 0, west: 2, up: 4, down: 6, south: 8, north: 10 };

function createCubeGeometry(def: CubeDef): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(def.size[0], def.size[1], def.size[2]);
  const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
  const arr = uvAttr.array as Float32Array;
  const tw = 64;
  const th = 64;

  for (const [name, idx] of Object.entries(FACE_ORDER)) {
    const uv = def.faces[name as keyof typeof def.faces];
    if (!uv) continue;
    const [u1, v1, u2, v2] = uv;
    const uvCoords = [
      [u1 / tw, 1 - v2 / th],
      [u2 / tw, 1 - v2 / th],
      [u2 / tw, 1 - v1 / th],
      [u1 / tw, 1 - v1 / th],
    ];
    const base = idx * 8;
    for (let i = 0; i < 4; i++) {
      arr[base + i * 2] = uvCoords[i][0];
      arr[base + i * 2 + 1] = uvCoords[i][1];
    }
  }
  uvAttr.needsUpdate = true;

  const origin: [number, number, number] = def.origin || [
    def.position[0] + def.size[0] / 2,
    def.position[1] + def.size[1] / 2,
    def.position[2] + def.size[2] / 2,
  ];

  geo.translate(
    def.position[0] + def.size[0] / 2 - origin[0],
    def.position[1] + def.size[1] / 2 - origin[1],
    def.position[2] + def.size[2] / 2 - origin[2]
  );

  return geo;
}

function SkinMesh({ def, material, animRef }: { def: CubeDef; material: THREE.Material; animRef?: React.RefObject<THREE.Group> }) {
  const geo = useMemo(() => createCubeGeometry(def), [def]);
  const origin = def.origin || [
    def.position[0] + def.size[0] / 2,
    def.position[1] + def.size[1] / 2,
    def.position[2] + def.size[2] / 2,
  ] as [number, number, number];

  return (
    <group ref={animRef} position={[origin[0], origin[1], origin[2]]}>
      <mesh geometry={geo} material={material} />
    </group>
  );
}

function SkinModel({ texture, animate }: { texture: THREE.Texture; animate: boolean }) {
  const headRef = useRef<THREE.Group>(null);
  const rArmRef = useRef<THREE.Group>(null);
  const lArmRef = useRef<THREE.Group>(null);
  const rLegRef = useRef<THREE.Group>(null);
  const lLegRef = useRef<THREE.Group>(null);

  const mat = useMemo(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshLambertMaterial({ map: texture, transparent: true, alphaTest: 0.05, side: THREE.FrontSide });
  }, [texture]);

  useFrame((_, delta) => {
    if (!animate) return;
    const swing = Math.sin(performance.now() * 0.004) * 0.6;
    if (rArmRef.current) rArmRef.current.rotation.x = swing;
    if (lArmRef.current) lArmRef.current.rotation.x = -swing;
    if (rLegRef.current) rLegRef.current.rotation.x = -swing;
    if (lLegRef.current) lLegRef.current.rotation.x = swing;
  });

  return (
    <group scale={[0.9375, 0.9375, 0.9375]}>
      <SkinMesh def={STEVE_CUBES[0]} material={mat} animRef={headRef} />
      <SkinMesh def={STEVE_CUBES[1]} material={mat} animRef={headRef} />
      <SkinMesh def={STEVE_CUBES[2]} material={mat} />
      <SkinMesh def={STEVE_CUBES[3]} material={mat} />
      <SkinMesh def={STEVE_CUBES[4]} material={mat} animRef={rArmRef} />
      <SkinMesh def={STEVE_CUBES[5]} material={mat} animRef={rArmRef} />
      <SkinMesh def={STEVE_CUBES[6]} material={mat} animRef={lArmRef} />
      <SkinMesh def={STEVE_CUBES[7]} material={mat} animRef={lArmRef} />
      <SkinMesh def={STEVE_CUBES[8]} material={mat} animRef={rLegRef} />
      <SkinMesh def={STEVE_CUBES[9]} material={mat} animRef={rLegRef} />
      <SkinMesh def={STEVE_CUBES[10]} material={mat} animRef={lLegRef} />
      <SkinMesh def={STEVE_CUBES[11]} material={mat} animRef={lLegRef} />
    </group>
  );
}

function SceneContent({ skinUrl, animate }: { skinUrl: string; animate: boolean }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    new THREE.TextureLoader().load(skinUrl, (t) => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    }, undefined, (e) => { console.error('Texture load error:', e); });
  }, [skinUrl]);

  if (!tex) return null;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 1, 1]} intensity={0.8} />
      <directionalLight position={[-1, 0.3, -1]} intensity={0.3} />
      <SkinModel texture={tex} animate={animate} />
      <OrbitControls enablePan={false} minDistance={25} maxDistance={120} minPolarAngle={0} maxPolarAngle={Math.PI} />
    </>
  );
}

export function SkinPreview3D({ skinUrl, width = 400, height = 500, animate = true }: SkinPreview3DProps) {
  if (!skinUrl) {
    return (
      <div className={styles.container} style={{ width, height }}>
        <div className={styles.placeholder}><span>上传皮肤后预览</span></div>
      </div>
    );
  }
  return (
    <div className={styles.container} style={{ width, height }}>
      <Canvas camera={{ position: [35, 28, 35], fov: 45 }} gl={{ preserveDrawingBuffer: true, antialias: false }}>
        <SceneContent skinUrl={skinUrl} animate={animate} />
      </Canvas>
      <div className={styles.hint}>拖拽旋转 · 滚轮缩放</div>
    </div>
  );
}

export default SkinPreview3D;
