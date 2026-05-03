import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import styles from './SkinPreview3D.module.css';

interface SkinPreview3DProps {
  skinUrl: string | null;
  width?: number;
  height?: number;
  animate?: boolean;
  showControls?: boolean;
}

function MinecraftModel({ skinTexture, animate = true }: { skinTexture: THREE.Texture; animate?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    skinTexture.magFilter = THREE.NearestFilter;
    skinTexture.minFilter = THREE.NearestFilter;
    skinTexture.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: skinTexture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    });
  }, [skinTexture]);

  useFrame((state) => {
    if (!animate) return;

    const time = state.clock.elapsedTime;

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(time * 3) * 0.5;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -Math.sin(time * 3) * 0.5;
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = -Math.sin(time * 3) * 0.5;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = Math.sin(time * 3) * 0.5;
    }
  });

  const createBoxUVs = (x: number, y: number, w: number, h: number, d: number): Float32Array => {
    const uv = new Float32Array(48);
    const faceUVs = [
      [x + d, y + d, w, h],
      [x + d + w + d, y + d, w, h],
      [x + d, y, w, d],
      [x + d, y + d + h, w, d],
      [x, y + d, d, h],
      [x + d + w, y + d, d, h],
    ];
    let idx = 0;
    for (const [u, v, fw, fh] of faceUVs) {
      const u1 = u / 64, v1 = v / 64, u2 = (u + fw) / 64, v2 = (v + fh) / 64;
      uv[idx++] = u1; uv[idx++] = v2;
      uv[idx++] = u2; uv[idx++] = v2;
      uv[idx++] = u2; uv[idx++] = v1;
      uv[idx++] = u1; uv[idx++] = v1;
    }
    return uv;
  };

  const createPart = (uvX: number, uvY: number, width: number, height: number, depth: number) => {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute;
    const newUVs = createBoxUVs(uvX, uvY, width, height, depth);
    uvAttr.array.set(newUVs);
    uvAttr.needsUpdate = true;
    return geometry;
  };

  return (
    <group ref={groupRef} scale={[1, 1, 1]}>
      <mesh position={[0, 12, 0]} geometry={createPart(0, 0, 8, 8, 8)} material={material} />
      
      <mesh position={[0, 4, 0]} geometry={createPart(16, 16, 4, 6, 2)} material={material} />
      
      <mesh ref={rightArmRef} position={[-4, 4, 0]} geometry={createPart(40, 16, 2, 6, 2)} material={material} />
      
      <mesh ref={leftArmRef} position={[4, 4, 0]} geometry={createPart(32, 48, 2, 6, 2)} material={material} />
      
      <mesh ref={rightLegRef} position={[-2, -4, 0]} geometry={createPart(0, 16, 2, 6, 2)} material={material} />
      
      <mesh ref={leftLegRef} position={[2, -4, 0]} geometry={createPart(16, 48, 2, 6, 2)} material={material} />
    </group>
  );
}

function Scene({ skinUrl, animate }: { skinUrl: string; animate: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      skinUrl,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.needsUpdate = true;
        setTexture(tex);
        setError(null);
      },
      undefined,
      (err) => {
        console.error('Texture loading error:', err);
        setError('Failed to load texture');
      }
    );
  }, [skinUrl]);

  if (error) {
    return null;
  }

  if (!texture) {
    return null;
  }

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <MinecraftModel skinTexture={texture} animate={animate} />
      <OrbitControls
        enablePan={false}
        minDistance={20}
        maxDistance={100}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
      <Environment preset="city" />
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div className={styles.container} style={{ width, height }} ref={containerRef}>
      <Canvas
        camera={{ position: [30, 20, 30], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
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
