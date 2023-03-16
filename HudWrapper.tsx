import { ScrollTicker } from '@/components/dom/navigation/Scroll'
import { useFrame, useThree, createPortal } from '@react-three/fiber'
import { PerspectiveCamera, Preload } from '@react-three/drei'
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  CopyPass,
  ClearPass,
  TextureEffect,
  BlendFunction,
  FXAAEffect,
  ShockWaveEffect,
} from 'postprocessing'
import { useEffect, useMemo, useRef, useState, memo } from 'react'
import { Scene, RGBAFormat, HalfFloatType, Vector3 } from 'three'
import { BlackHoleEffect } from '../../effects/BlackHole/BlackHoleEffect'
import { useAppSelector } from '@/redux/store'
import { useSpringRef, useSpring, animated } from '@react-spring/three'
import { Globals } from '@react-spring/shared'
import { BlackHoleCoreEffect } from '../../effects/BlackHole/BlackHoleCoreEffect'

Globals.assign({
  frameLoop: 'always',
})

type RenderHudProps = {
  defaultScene: THREE.Scene
  defaultCamera: THREE.Camera
}

type HudProps = {
  children: React.ReactNode
}

function RenderHud({ defaultScene, defaultCamera }: RenderHudProps) {
  console.log('renderhud')
  const { gl, scene, camera, size } = useThree()
  const blackHoleEffect = useMemo(() => new BlackHoleEffect(), [])
  const shockwaveEffect = useMemo(
    () =>
      new ShockWaveEffect(camera, new Vector3(0, 0, 0), {
        speed: 3,
        amplitude: -0.2,
        waveSize: 1,
        maxRadius: 0.2,
      }),
    [camera],
  )
  const inverseShockwaveEffect = useMemo(
    () =>
      new ShockWaveEffect(camera, new Vector3(0, 0, 0), {
        speed: 3,
        amplitude: 0.2,
        waveSize: 1,
        maxRadius: 1,
      }),
    [camera],
  )
  const blackHoleCoreEffect = useMemo(() => new BlackHoleCoreEffect(), [])

  const composer = useMemo(() => {
    console.log('new composer')
    const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType })
    const bloomEffect = new BloomEffect({ luminanceThreshold: 0.8 })
    const fxaaEffect = new FXAAEffect()
    const savePass = new CopyPass()
    savePass.texture.format = RGBAFormat
    const textureEffect = new TextureEffect({
      blendFunction: BlendFunction.ALPHA,
      texture: savePass.texture,
    })

    const renderPass = new RenderPass(defaultScene, defaultCamera)

    const renderHudPass = new RenderPass(scene, camera)

    const clearPassA = new ClearPass()
    const clearPassB = new ClearPass()
    clearPassA.overrideClearAlpha = 0.0

    const effectHudPass = new EffectPass(camera, fxaaEffect, bloomEffect)
    const blackHolePass = new EffectPass(camera, blackHoleEffect)

    renderPass.clear = false
    renderHudPass.clear = false
    const blendPass = new EffectPass(defaultCamera, textureEffect)

    composer.addPass(clearPassA)
    composer.addPass(renderHudPass)
    composer.addPass(effectHudPass)
    composer.addPass(blackHolePass)

    composer.addPass(savePass)
    composer.addPass(clearPassB)

    composer.addPass(renderPass)
    composer.addPass(new EffectPass(camera, shockwaveEffect))
    composer.addPass(new EffectPass(camera, inverseShockwaveEffect))

    composer.addPass(blendPass)
    composer.addPass(new EffectPass(camera, blackHoleCoreEffect))
    composer.addPass(new EffectPass(camera, fxaaEffect))

    return composer
  }, [gl, scene, camera, size])

  const { inverse, active } = useAppSelector((state) => state.transition)

  const api = useSpringRef()
  const springs = useSpring({
    ref: api,
    config: {
      mass: 10,
      friction: 120,
      tension: 20,
    },
    from: {
      angle: 0,
      radius: 0,
    },
  })

  useEffect(() => {
    if (active) {
      // twist first
      api.start({
        to: {
          radius: size.height,
        },
      })
      setTimeout(() => {
        api.start({
          to: {
            angle: inverse ? 6 : -6,
          },
        })
      }, 100)
      setTimeout(() => {
        shockwaveEffect.explode()
      }, 50)
    } else {
      api.start({
        radius: 0,
        angle: 0,
      })
      setTimeout(() => {
        inverseShockwaveEffect.explode()
      }, 10)
    }
  }, [active])

  useFrame(({ clock }, delta) => {
    composer.render()
    blackHoleEffect.uniforms.get('angle').value = springs.angle.get()
    blackHoleEffect.uniforms.get('radius').value = springs.radius.get()
    blackHoleCoreEffect.uniforms.get('radius').value = springs.radius.get()
    blackHoleCoreEffect.uniforms.get('time').value = clock.getElapsedTime()
    springs.angle.advance(delta * 1000)
    springs.radius.advance(delta * 1000)
  }, 1)
  return <></>
}

const MemoizedRenderHud = memo(RenderHud, () => true)

export function HudWrapper({ children }: HudProps) {
  const { scene: defaultScene, camera: defaultCamera } = useThree()
  const [hudScene] = useState(() => new Scene())
  const { active } = useAppSelector((state) => state.transition)
  const api = useSpringRef()
  const springs = useSpring({
    ref: api,
    config: {
      precision: 0.0001,
      mass: 5,
      friction: 120,
      tension: 120,
      bounce: 2,
    },
    from: {
      scale: 1,
    },
  })

  useEffect(() => {
    if (active) {
      setTimeout(() => {
        api.start({
          to: {
            scale: 0,
          },
        })
      }, 200)
    } else {
      api.start({
        to: {
          scale: 1,
        },
      })
    }
  }, [active])

  useFrame(({}, delta) => {
    springs.scale.advance(delta * 1000)
  })
  return (
    <>
      {createPortal(
        <>
          {/* <Satellites /> */}
          <PerspectiveCamera makeDefault position={[0, 0, 10]} />
          <pointLight position={[-3, 1.5, 7]} intensity={1.0} />
          <ScrollTicker />
          <Preload all />
          <MemoizedRenderHud
            defaultScene={defaultScene}
            defaultCamera={defaultCamera}
          />
          <animated.group scale={springs.scale}>{children}</animated.group>
        </>,
        hudScene,
        { events: { priority: 1 } },
      )}
    </>
  )
}
