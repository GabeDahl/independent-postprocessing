import { Canvas } from '@react-three/fiber'
import { Environment, Preload, useCubeTexture } from '@react-three/drei'
import { Camera } from './objects/Camera'
import { HudWrapper } from './objects/layout/HudWrapper'

export default function Scene({ children, ...props }) {
  return (
    <>
      <Canvas {...props} linear flat>
        <Env />
        <HudWrapper>{children}</HudWrapper>
        <Camera />
        <Preload all />
      </Canvas>
    </>
  )
}

const Env = () => {
  const spaceTex = useCubeTexture(
    [
      'customRT.png',
      'customLF.png',
      'customUP.png',
      'customDN.png',
      'customFT.png',
      'customBK.png',
    ],
    { path: 'img/space/custom/teal-purple/' },
  )
  return <Environment map={spaceTex} background />
}
