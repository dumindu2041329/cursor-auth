import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

function Particles() {
  const points = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const num = 1500
    const arr = new Float32Array(num * 3)
    for (let i = 0; i < num; i++) {
      const i3 = i * 3
      arr[i3 + 0] = (Math.random() - 0.5) * 40
      arr[i3 + 1] = (Math.random() - 0.5) * 24
      arr[i3 + 2] = (Math.random() - 0.5) * 40
    }
    return arr
  }, [])

  useFrame((state) => {
    if (!points.current) return
    const t = state.clock.getElapsedTime() * 0.15
    points.current.rotation.y = t
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color={new THREE.Color('#a78bfa')} sizeAttenuation depthWrite={false} transparent opacity={0.9} />
    </points>
  )
}

function GlassBlob() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!mesh.current) return
    const t = state.clock.getElapsedTime()
    mesh.current.rotation.x = Math.sin(t / 2) * 0.4
    mesh.current.rotation.y = Math.cos(t / 3) * 0.6
  })
  return (
    <Float speed={1.2} rotationIntensity={0.5} floatIntensity={1.4}>
      <mesh ref={mesh} position={[0, 0.5, -2]}
        castShadow receiveShadow>
        <icosahedronGeometry args={[1.2, 2]} />
        <meshPhysicalMaterial
          transmission={1}
          thickness={0.6}
          roughness={0}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          color={new THREE.Color('#7c3aed')}
          attenuationColor={new THREE.Color('#4c1d95')}
          attenuationDistance={2}
          ior={1.4}
        />
      </mesh>
    </Float>
  )
}

export default function BackgroundCanvas() {
  return (
    <div className="scene-container" aria-hidden>
      <Canvas camera={{ position: [0, 1, 4], fov: 55 }} dpr={[1, 2]}>
        <color attach="background" args={[0, 0, 0]} />
        <fog attach="fog" args={[new THREE.Color('#0b1020'), 10, 50]} />

        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 4]} intensity={1.2} castShadow />

        <Particles />
        <Stars radius={40} depth={50} count={2000} factor={3} saturation={0} fade speed={0.6} />
        <GlassBlob />

        <Environment preset="city" />

        <EffectComposer multisampling={2}>
          <Bloom intensity={0.45} luminanceThreshold={0.2} luminanceSmoothing={0.2} />
          <Vignette eskil={false} offset={0.12} darkness={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}


