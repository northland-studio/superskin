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

type FaceUV = [number, number, number, number];

interface SkinBoxData {
  size: [number, number, number];
  position: [number, number, number];
  origin?: [number, number, number];
  faces: {
    east: FaceUV;
    west: FaceUV;
    up: FaceUV;
    down: FaceUV;
    south: FaceUV;
    north: FaceUV;
  };
}

const STEVE_MODEL: Record<string, SkinBoxData> = {
  head: {
    size: [8, 8, 8],
    position: [0, 24, 0],
    faces: {
      east:  [0, 8, 8, 16],
      west:  [16, 8, 24, 16],
      up:    [8, 0, 16, 8],
      down:  [16, 0, 24, 8],
      south: [24, 8, 32, 16],
      north: [8, 8, 16, 16],
    },
  },
  headLayer: {
    size: [9, 9, 9],
    position: [0, 24, 0],
    faces: {
      east:  [32, 8, 40, 16],
      west:  [48, 8, 56, 16],
      up:    [40, 0, 48, 8],
      down:  [48, 0, 56, 8],
      south: [56, 8, 64, 16],
      north: [40, 8, 48, 16],
    },
  },
  body: {
    size: [8, 12, 4],
    position: [0, 18, 0],
    faces: {
      east:  [16, 20, 20, 32],
      west:  [28, 20, 32, 32],
      up:    [20, 16, 28, 20],
      down:  [28, 16, 36, 20],
      south: [32, 20, 40, 32],
      north: [20, 20, 28, 32],
    },
  },
  bodyLayer: {
    size: [8.5, 12.5, 4.5],
    position: [0, 18, 0],
    faces: {
      east:  [16, 36, 20, 48],
      west:  [28, 36, 32, 48],
      up:    [20, 32, 28, 36],
      down:  [28, 32, 36, 36],
      south: [32, 36, 40, 48],
      north: [20, 36, 28, 48],
    },
  },
  rightArm: {
    size: [4, 12, 4],
    position: [4, 18, 0],
    origin: [4, 22, 0],
    faces: {
      east:  [40, 20, 44, 32],
      west:  [48, 20, 52, 32],
      up:    [44, 16, 48, 20],
      down:  [48, 16, 52, 20],
      south: [52, 20, 56, 32],
      north: [44, 20, 48, 32],
    },
  },
  rightArmLayer: {
    size: [4.5, 12.5, 4.5],
    position: [4, 18, 0],
    origin: [4, 22, 0],
    faces: {
      east:  [40, 36, 44, 48],
      west:  [48, 36, 52, 48],
      up:    [44, 32, 48, 36],
      down:  [48, 32, 52, 36],
      south: [52, 36, 56, 48],
      north: [44, 36, 48, 48],
    },
  },
  leftArm: {
    size: [4, 12, 4],
    position: [-4, 18, 0],
    origin: [-4, 22, 0],
    faces: {
      east:  [32, 52, 36, 64],
      west:  [40, 52, 44, 64],
      up:    [36, 48, 40, 52],
      down:  [40, 48, 44, 52],
      south: [44, 52, 48, 64],
      north: [36, 52, 40, 64],
    },
  },
  leftArmLayer: {
    size: [4.5, 12.5, 4.5],
    position: [-4, 18, 0],
    origin: [-4, 22, 0],
    faces: {
      east:  [48, 52, 52, 64],
      west:  [56, 52, 60, 64],
      up:    [52, 48, 56, 52],
      down:  [56, 48, 60, 52],
      south: [60, 52, 64, 64],
      north: [52, 52, 56, 64],
    },
  },
  rightLeg: {
    size: [4, 12, 4],
    position: [2, 6, 0],
    origin: [2, 18, 0],
    faces: {
      east:  [0, 20, 4, 32],
      west:  [8, 20, 12, 32],
      up:    [4, 16, 8, 20],
      down:  [8, 16, 12, 20],
      south: [12, 20, 16, 32],
      north: [4, 20, 8, 32],
    },
  },
  rightLegLayer: {
    size: [4.5, 12.5, 4.5],
    position: [2, 6, 0],
    origin: [2, 18, 0],
    faces: {
      east:  [0, 36, 4, 48],
      west:  [8, 36, 12, 48],
      up:    [4, 32, 8, 36],
      down:  [8, 32, 12, 36],
      south: [12, 36, 16, 48],
      north: [4, 36, 8, 48],
    },
  },
  leftLeg: {
    size: [4, 12, 4],
    position: [-2, 6, 0],
    origin: [-2, 18, 0],
    faces: {
      east:  [16, 52, 20, 64],
      west:  [24, 52, 28, 64],
      up:    [20, 48, 24, 52],
      down:  [24, 48, 28, 52],
      south: [28, 52, 32, 64],
      north: [20, 52, 24, 64],
    },
  },
  leftLegLayer: {
    size: [4.5, 12.5, 4.5],
    position: [-2, 6, 0],
    origin: [-2, 18, 0],
    faces: {
      east:  [0, 52, 4, 64],
      west:  [8, 52, 12, 64],
      up:    [4, 48, 8, 52],
      down:  [8, 48, 12, 52],
      south: [12, 52, 16, 64],
      north: [4, 52, 8, 64],
    },
  },
};

const FACE_INDICES: Record<string, number> = {
  east: 0,
  west: 2,
  up: 4,
  down: 6,
  south: 8,
  north: 10,
};

function createSkinBoxGeometry(boxData: SkinBoxData): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(boxData.size[0], boxData.size[1], boxData.size[2]);
  const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const uvArray = uvAttr.array as Float32Array;

  const tw = 64;
  const th = 64;

  for (const [faceName, fIndex] of Object.entries(FACE_INDICES)) {
    const faceUV = boxData.faces[faceName as keyof typeof boxData.faces];
    if (!faceUV) continue;

    const [u1, v1, u2, v2] = faceUV;

    const uv0 = [u1 / tw, 1 - v2 / th];
    const uv1 = [u2 / tw, 1 - v2 / th];
    const uv2 = [u2 / tw, 1 - v1 / th];
    const uv3 = [u1 / tw, 1 - v1 / th];

    const base = fIndex * 4 * 2;
    uvArray[base + 0] = uv0[0]; uvArray[base + 1] = uv0[1];
    uvArray[base + 2] = uv1[0]; uvArray[base + 3] = uv1[1];
    uvArray[base + 4] = uv2[0]; uvArray[base + 5] = uv2[1];
    uvArray[base + 6] = uv3[0]; uvArray[base + 7] = uv3[1];
  }

  uvAttr.needsUpdate = true;

  const origin = boxData.origin || boxData.position;
  geometry.translate(
    boxData.position[0] - origin[0],
    boxData.position[1] - origin[1] + boxData.size[1] / 2,
    boxData.position[2] - origin[2]
  );

  return geometry;
}

function BodyPart({
  boxData,
  material,
  animateRef,
}: {
  boxData: SkinBoxData;
  material: THREE.Material;
  animateRef?: React.RefObject<THREE.Group>;
}) {
  const geometry = useMemo(() => createSkinBoxGeometry(boxData), [boxData]);
  const origin = boxData.origin || [0, 0, 0];

  return (
    <group ref={animateRef} position={[origin[0], origin[1], origin[2]]}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}

function MinecraftSkinModel({
  texture,
  animate = true,
}: {
  texture: THREE.Texture;
  animate?: boolean;
}) {
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);

  const baseMaterial = useMemo(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;

    return new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.FrontSide,
    });
  }, [texture]);

  const layerMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.FrontSide,
    });
  }, [texture]);

  useFrame((state) => {
    if (!animate) return;

    const time = state.clock.elapsedTime;
    const swing = Math.sin(time * 4) * 0.6;

    if (rightArmRef.current) rightArmRef.current.rotation.x = swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
  });

  return (
    <group>
      <BodyPart boxData={STEVE_MODEL.head} material={baseMaterial} />
      <BodyPart boxData={STEVE_MODEL.headLayer} material={layerMaterial} />
      <BodyPart boxData={STEVE_MODEL.body} material={baseMaterial} />
      <BodyPart boxData={STEVE_MODEL.bodyLayer} material={layerMaterial} />
      <BodyPart boxData={STEVE_MODEL.rightArm} material={baseMaterial} animateRef={rightArmRef} />
      <BodyPart boxData={STEVE_MODEL.rightArmLayer} material={layerMaterial} animateRef={rightArmRef} />
      <BodyPart boxData={STEVE_MODEL.leftArm} material={baseMaterial} animateRef={leftArmRef} />
      <BodyPart boxData={STEVE_MODEL.leftArmLayer} material={layerMaterial} animateRef={leftArmRef} />
      <BodyPart boxData={STEVE_MODEL.rightLeg} material={baseMaterial} animateRef={rightLegRef} />
      <BodyPart boxData={STEVE_MODEL.rightLegLayer} material={layerMaterial} animateRef={rightLegRef} />
      <BodyPart boxData={STEVE_MODEL.leftLeg} material={baseMaterial} animateRef={leftLegRef} />
      <BodyPart boxData={STEVE_MODEL.leftLegLayer} material={layerMaterial} animateRef={leftLegRef} />
    </group>
  );
}

function Scene({ skinUrl, animate }: { skinUrl: string; animate: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      skinUrl,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.needsUpdate = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      (err) => {
        console.error('Texture loading error:', err);
      }
    );
  }, [skinUrl]);

  if (!texture) return null;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 1, 1]} intensity={0.8} />
      <directionalLight position={[-1, 0.5, -1]} intensity={0.3} />
      <MinecraftSkinModel texture={texture} animate={animate} />
      <OrbitControls
        enablePan={false}
        minDistance={30}
        maxDistance={150}
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
  showControls = true,
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
        camera={{ position: [50, 40, 50], fov: 40 }}
        gl={{ preserveDrawingBuffer: true, antialias: false }}
      >
        <Scene skinUrl={skinUrl} animate={animate} />
      </Canvas>
      {showControls && (
        <div className={styles.hint}>
          拖拽旋转 · 滚轮缩放
        </div>
      )}
    </div>
  );
}

export default SkinPreview3D;
