import React, { useLayoutEffect, useMemo } from 'react';
import {
  AbsoluteFill,
  Composition,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';

// ============================================================================
// Video Constants & Script Timeline (1080x1920 @ 60fps = 1200 frames / 20s)
// ============================================================================

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 60;
export const VIDEO_DURATION_IN_FRAMES = 1200;

interface TextToken {
  text: string;
  accentColor?: string;
}

interface SubtitleSegment {
  id: string;
  startFrame: number;
  endFrame: number;
  tokens: TextToken[];
}

const SCRIPT_SEGMENTS: SubtitleSegment[] = [
  {
    id: 'intro',
    startFrame: 0,
    endFrame: 300,
    tokens: [
      { text: 'In this world, everybody has a ' },
      { text: 'narrator', accentColor: '#FDE047' },
      { text: '... and whatever the narrator says ' },
      { text: 'happens.', accentColor: '#FDE047' },
    ],
  },
  {
    id: 'old-narrator',
    startFrame: 301,
    endFrame: 660,
    tokens: [
      { text: 'My old narrator was the best. ' },
      { text: 'Warm and soft', accentColor: '#FDBA74' },
      { text: '... but last year he ' },
      { text: 'retired.', accentColor: '#CBD5E1' },
    ],
  },
  {
    id: 'new-narrator',
    startFrame: 661,
    endFrame: 960,
    tokens: [
      { text: 'And I got a new one. And he ' },
      { text: 'hates me.', accentColor: '#FCA5A5' },
      { text: ' A ' },
      { text: 'tiny gray cloud', accentColor: '#93C5FD' },
      { text: ' appeared over my head.' },
    ],
  },
  {
    id: 'dramatic-pause',
    startFrame: 961,
    endFrame: 1200,
    tokens: [
      { text: 'And then... a long, ' },
      { text: 'dramatic pause.', accentColor: '#E2E8F0' },
    ],
  },
];

// ============================================================================
// 3D Camera Rig (Synchronized with Remotion's useCurrentFrame)
// ============================================================================

interface CameraRigProps {
  characterZ: number;
}

const CameraRig: React.FC<CameraRigProps> = ({ characterZ }) => {
  const camera = useThree((state) => state.camera);
  const frame = useCurrentFrame();

  useLayoutEffect(() => {
    // Subtle push-in during the final "dramatic pause" (frames 961-1200)
    const dramaticPushIn = interpolate(frame, [961, 1200], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    // Gentle vertical breathing motion for cinematic framing
    const floatY = Math.sin(frame * 0.04) * 0.04;

    // 3/4 front-tracking angle ahead of the character along -Z
    const camX = 3.1 - dramaticPushIn * 0.55;
    const camY = 2.35 + floatY - dramaticPushIn * 0.15;
    const camZ = characterZ - 6.4 + dramaticPushIn * 1.45;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, 1.78, characterZ);
    camera.updateProjectionMatrix();
  }, [camera, characterZ, frame]);

  return null;
};

// ============================================================================
// 3D Tiny Gray Raincloud Component
// ============================================================================

interface RaincloudProps {
  baseY: number;
  stormIntensity: number;
}

const TinyGrayRaincloud: React.FC<RaincloudProps> = ({ baseY, stormIntensity }) => {
  const frame = useCurrentFrame();

  // Gentle vertical bobbing using Math.sin()
  const bobOffset = Math.sin(frame * 0.08) * 0.11;
  const tiltZ = Math.sin(frame * 0.045) * 0.04;

  // Deterministic cloud color shift as the new narrator takes over
  const cloudPrimary = interpolateColors(
    stormIntensity,
    [0, 1],
    ['#8A94A6', '#5E6778']
  );
  const cloudSecondary = interpolateColors(
    stormIntensity,
    [0, 1],
    ['#9CA5B5', '#6E778A']
  );

  // Procedural raindrop positions cycling below the cloud
  const raindrops = useMemo(
    () => [
      { x: -0.36, z: 0.12, phase: 0, speed: 0.09 },
      { x: -0.14, z: -0.16, phase: 0.35, speed: 0.11 },
      { x: 0.08, z: 0.18, phase: 0.68, speed: 0.1 },
      { x: 0.3, z: -0.08, phase: 0.2, speed: 0.12 },
      { x: 0.44, z: 0.1, phase: 0.55, speed: 0.095 },
      { x: -0.24, z: 0.02, phase: 0.82, speed: 0.105 },
    ],
    []
  );

  return (
    <group position={[0, baseY + bobOffset, 0]} rotation={[0, 0, tiltZ]}>
      {/* Blocky modular cloud puffs */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.92, 0.42, 0.68]} />
        <meshStandardMaterial color={cloudPrimary} roughness={0.9} />
      </mesh>
      <mesh position={[-0.42, -0.04, 0.04]} castShadow>
        <boxGeometry args={[0.52, 0.34, 0.56]} />
        <meshStandardMaterial color={cloudSecondary} roughness={0.9} />
      </mesh>
      <mesh position={[0.42, -0.02, -0.04]} castShadow>
        <boxGeometry args={[0.56, 0.36, 0.58]} />
        <meshStandardMaterial color={cloudSecondary} roughness={0.9} />
      </mesh>
      <mesh position={[0.08, 0.26, 0.02]} castShadow>
        <boxGeometry args={[0.56, 0.26, 0.5]} />
        <meshStandardMaterial color={cloudPrimary} roughness={0.9} />
      </mesh>
      <mesh position={[-0.2, 0.22, -0.06]} castShadow>
        <boxGeometry args={[0.38, 0.22, 0.44]} />
        <meshStandardMaterial color={cloudSecondary} roughness={0.9} />
      </mesh>

      {/* Stylized falling raindrops underneath the cloud */}
      {raindrops.map((drop, index) => {
        const cycle = (frame * drop.speed + drop.phase) % 1;
        const dropY = interpolate(cycle, [0, 1], [-0.22, -1.35]);
        const dropScaleY = interpolate(stormIntensity, [0, 1], [0.65, 1.15]);

        return (
          <mesh
            key={index}
            position={[drop.x, dropY, drop.z]}
            scale={[1, dropScaleY, 1]}
          >
            <boxGeometry args={[0.035, 0.14, 0.035]} />
            <meshStandardMaterial
              color="#7DD3FC"
              emissive="#38BDF8"
              emissiveIntensity={0.25}
              transparent
              opacity={0.75}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================================================
// 3D Blocky Animated Character Rig
// ============================================================================

interface BlockyCharacterProps {
  positionZ: number;
  walkAmplitude: number;
  stormIntensity: number;
}

const BlockyCharacter: React.FC<BlockyCharacterProps> = ({
  positionZ,
  walkAmplitude,
  stormIntensity,
}) => {
  const frame = useCurrentFrame();

  // Procedural walk cycle tied to useCurrentFrame()
  const walkSpeed = 0.17;
  const phase = frame * walkSpeed;

  const legSwing = Math.sin(phase) * 0.58 * walkAmplitude;
  const armSwing = Math.sin(phase) * 0.45 * walkAmplitude;

  // Vertical gait bob (doubles frequency so both left & right steps lift)
  const stepBob = Math.abs(Math.sin(phase)) * 0.075 * walkAmplitude;
  const torsoTilt = Math.sin(phase * 2) * 0.025 * walkAmplitude;

  return (
    // Facing -Z (rotated 180 deg around Y so local +Z faces world -Z)
    <group position={[0, stepBob, positionZ]} rotation={[0, Math.PI, 0]}>
      {/* Torso / Jacket */}
      <group position={[0, 1.24, 0]} rotation={[0.04, 0, torsoTilt]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.74, 0.88, 0.44]} />
          <meshStandardMaterial color="#3B82F6" roughness={0.75} />
        </mesh>

        {/* Subtle scarf / collar detail */}
        <mesh position={[0, 0.42, 0.02]} castShadow>
          <boxGeometry args={[0.64, 0.12, 0.46]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.8} />
        </mesh>

        {/* Backpack */}
        <mesh position={[0, 0.02, -0.28]} castShadow>
          <boxGeometry args={[0.56, 0.64, 0.18]} />
          <meshStandardMaterial color="#D97706" roughness={0.8} />
        </mesh>

        {/* Head */}
        <group position={[0, 0.82, 0]} rotation={[0.06 * stormIntensity, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.62, 0.62]} />
            <meshStandardMaterial color="#F3C6A5" roughness={0.7} />
          </mesh>

          {/* Hair */}
          <mesh position={[0, 0.27, -0.02]} castShadow>
            <boxGeometry args={[0.66, 0.16, 0.66]} />
            <meshStandardMaterial color="#27272A" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.15, -0.27]} castShadow>
            <boxGeometry args={[0.65, 0.26, 0.14]} />
            <meshStandardMaterial color="#27272A" roughness={0.85} />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.14, 0.03, 0.315]}>
            <boxGeometry args={[0.08, 0.1, 0.03]} />
            <meshStandardMaterial color="#18181B" roughness={0.4} />
          </mesh>
          <mesh position={[0.14, 0.03, 0.315]}>
            <boxGeometry args={[0.08, 0.1, 0.03]} />
            <meshStandardMaterial color="#18181B" roughness={0.4} />
          </mesh>

          {/* Eyebrows (angle downward slightly as raincloud/new narrator sets in) */}
          <mesh
            position={[-0.14, 0.13, 0.32]}
            rotation={[0, 0, -0.18 * stormIntensity]}
          >
            <boxGeometry args={[0.12, 0.035, 0.03]} />
            <meshStandardMaterial color="#27272A" />
          </mesh>
          <mesh
            position={[0.14, 0.13, 0.32]}
            rotation={[0, 0, 0.18 * stormIntensity]}
          >
            <boxGeometry args={[0.12, 0.035, 0.03]} />
            <meshStandardMaterial color="#27272A" />
          </mesh>

          {/* Mouth */}
          <mesh position={[0, -0.14, 0.315]}>
            <boxGeometry args={[0.16, 0.035, 0.03]} />
            <meshStandardMaterial color="#9A5B47" />
          </mesh>
        </group>

        {/* Left Arm (pivots from shoulder) */}
        <group position={[-0.51, 0.36, 0]} rotation={[-armSwing, 0, 0.04]}>
          <mesh position={[0, -0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.24, 0.78, 0.26]} />
            <meshStandardMaterial color="#2563EB" roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.77, 0]} castShadow>
            <boxGeometry args={[0.21, 0.16, 0.22]} />
            <meshStandardMaterial color="#F3C6A5" roughness={0.7} />
          </mesh>
        </group>

        {/* Right Arm (pivots from shoulder, opposite phase) */}
        <group position={[0.51, 0.36, 0]} rotation={[armSwing, 0, -0.04]}>
          <mesh position={[0, -0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.24, 0.78, 0.26]} />
            <meshStandardMaterial color="#2563EB" roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.77, 0]} castShadow>
            <boxGeometry args={[0.21, 0.16, 0.22]} />
            <meshStandardMaterial color="#F3C6A5" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Left Leg (pivots from hip) */}
      <group position={[-0.19, 0.82, 0]} rotation={[legSwing, 0, 0]}>
        <mesh position={[0, -0.36, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.72, 0.3]} />
          <meshStandardMaterial color="#1E293B" roughness={0.85} />
        </mesh>
        {/* Left Shoe */}
        <mesh position={[0, -0.75, 0.05]} castShadow>
          <boxGeometry args={[0.3, 0.16, 0.4]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
        </mesh>
      </group>

      {/* Right Leg (pivots from hip, opposite phase) */}
      <group position={[0.19, 0.82, 0]} rotation={[-legSwing, 0, 0]}>
        <mesh position={[0, -0.36, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.72, 0.3]} />
          <meshStandardMaterial color="#1E293B" roughness={0.85} />
        </mesh>
        {/* Right Shoe */}
        <mesh position={[0, -0.75, 0.05]} castShadow>
          <boxGeometry args={[0.3, 0.16, 0.4]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
        </mesh>
      </group>

      {/* Tiny gray raincloud hovering directly above the character's head */}
      <TinyGrayRaincloud baseY={3.05} stormIntensity={stormIntensity} />
    </group>
  );
};

// ============================================================================
// 3D Street & Sidewalk Environment
// ============================================================================

const StreetEnvironment: React.FC = () => {
  const sidewalkTilePositions = useMemo(
    () => Array.from({ length: 24 }, (_, idx) => 8 - idx * 2),
    []
  );

  const lampPositions = useMemo(() => [4, -4, -12, -20, -28], []);

  const buildingBlocks = useMemo(
    () => [
      { z: 4, height: 6.5, width: 4.5, color: '#475569' },
      { z: -2, height: 8.2, width: 5.0, color: '#334155' },
      { z: -8, height: 5.8, width: 4.8, color: '#475569' },
      { z: -14, height: 9.0, width: 5.2, color: '#1E293B' },
      { z: -21, height: 7.2, width: 5.4, color: '#334155' },
      { z: -28, height: 8.5, width: 5.0, color: '#475569' },
    ],
    []
  );

  return (
    <group>
      {/* Main Sidewalk Ground Plane */}
      <mesh position={[0, -0.05, -14]} receiveShadow>
        <boxGeometry args={[5.4, 0.1, 64]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.92} />
      </mesh>

      {/* Sidewalk Curb */}
      <mesh position={[2.75, 0.02, -14]} receiveShadow castShadow>
        <boxGeometry args={[0.25, 0.24, 64]} />
        <meshStandardMaterial color="#64748B" roughness={0.9} />
      </mesh>

      {/* Adjacent Asphalt Road */}
      <mesh position={[7.4, -0.1, -14]} receiveShadow>
        <boxGeometry args={[9.0, 0.1, 64]} />
        <meshStandardMaterial color="#1E293B" roughness={0.95} />
      </mesh>

      {/* Repeating Sidewalk Expansion Joints for Motion Reference */}
      {sidewalkTilePositions.map((zPos) => (
        <mesh key={zPos} position={[0, 0.005, zPos]} receiveShadow>
          <boxGeometry args={[5.3, 0.012, 0.06]} />
          <meshStandardMaterial color="#64748B" roughness={0.95} />
        </mesh>
      ))}

      {/* Streetlamps Along the Sidewalk */}
      {lampPositions.map((zPos) => (
        <group key={zPos} position={[2.2, 0, zPos]}>
          <mesh position={[0, 2.2, 0]} castShadow>
            <boxGeometry args={[0.14, 4.4, 0.14]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
          </mesh>
          <mesh position={[-0.35, 4.35, 0]} castShadow>
            <boxGeometry args={[0.7, 0.12, 0.18]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
          </mesh>
          <mesh position={[-0.55, 4.24, 0]}>
            <boxGeometry args={[0.28, 0.1, 0.16]} />
            <meshStandardMaterial
              color="#FEF08A"
              emissive="#FACC15"
              emissiveIntensity={0.65}
            />
          </mesh>
        </group>
      ))}

      {/* Stylized Blocky Background Buildings */}
      {buildingBlocks.map((b, i) => (
        <mesh
          key={i}
          position={[-5.4, b.height / 2 - 0.1, b.z]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[4.4, b.height, b.width]} />
          <meshStandardMaterial color={b.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// 2D Synchronized Kinetic Subtitles Overlay
// ============================================================================

const KineticSubtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeSegment = SCRIPT_SEGMENTS.find(
    (seg) => frame >= seg.startFrame && frame <= seg.endFrame
  );

  if (!activeSegment) {
    return null;
  }

  const localFrame = frame - activeSegment.startFrame;
  const fadeFrames = 14;

  const opacity = interpolate(
    frame,
    [
      activeSegment.startFrame,
      activeSegment.startFrame + fadeFrames,
      activeSegment.endFrame - fadeFrames,
      activeSegment.endFrame,
    ],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const popSpring = spring({
    frame: localFrame,
    fps,
    config: {
      damping: 14,
      stiffness: 190,
      mass: 0.75,
    },
  });

  const scale = interpolate(popSpring, [0, 1], [0.88, 1]);
  const enterY = interpolate(popSpring, [0, 1], [28, 0]);
  const exitY = interpolate(
    frame,
    [activeSegment.endFrame - fadeFrames, activeSegment.endFrame],
    [0, -18],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingLeft: 72,
        paddingRight: 72,
        paddingBottom: 230,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${enterY + exitY}px) scale(${scale})`,
          textAlign: 'center',
          maxWidth: 920,
          backgroundColor: 'rgba(15, 23, 42, 0.42)',
          backdropFilter: 'blur(6px)',
          borderRadius: 28,
          padding: '26px 34px',
          border: '2px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily:
              '"Inter", "Montserrat", "Helvetica Neue", system-ui, -apple-system, sans-serif',
            fontWeight: 900,
            fontSize: 52,
            lineHeight: 1.24,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            textShadow:
              '0 4px 12px rgba(0, 0, 0, 0.85), 0 2px 3px rgba(0, 0, 0, 0.95)',
          }}
        >
          {activeSegment.tokens.map((token, idx) => (
            <span
              key={idx}
              style={{
                color: token.accentColor ?? '#FFFFFF',
              }}
            >
              {token.text}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Main Remotion Video Composition
// ============================================================================

export const NarratorCloudShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Character walks forward along -Z, then slows to a stop during the dramatic pause
  const characterZ = interpolate(
    frame,
    [0, 960, 1050, 1200],
    [0, -19.5, -20.4, -20.4],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Smoothly settle limbs back to neutral standing pose when pausing at frame 961+
  const walkAmplitude = interpolate(frame, [950, 1040], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Shift atmosphere from warm ("old narrator") to gloomy overcast ("new narrator")
  const stormIntensity = interpolate(frame, [620, 740], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const skyColor = interpolateColors(
    stormIntensity,
    [0, 1],
    ['#3B4C6B', '#1F2937']
  );

  const sunColor = interpolateColors(
    stormIntensity,
    [0, 1],
    ['#FFE4B5', '#CBD5E1']
  );

  return (
    <AbsoluteFill style={{ backgroundColor: skyColor }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        dpr={1}
        camera={{ fov: 42, near: 0.1, far: 120, position: [3.1, 2.35, -6.4] }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={[skyColor, 14, 42]} />

        {/* Camera tracking rig */}
        <CameraRig characterZ={characterZ} />

        {/* Ambient + Directional Lighting */}
        <ambientLight intensity={0.65} color="#E2E8F0" />
        <directionalLight
          position={[12, 18, 6]}
          intensity={1.75}
          color={sunColor}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-28}
          shadow-camera-right={28}
          shadow-camera-top={28}
          shadow-camera-bottom={-28}
          shadow-camera-near={1}
          shadow-camera-far={65}
          shadow-bias={-0.0005}
        />

        {/* 3D World & Animated Character */}
        <StreetEnvironment />
        <BlockyCharacter
          positionZ={characterZ}
          walkAmplitude={walkAmplitude}
          stormIntensity={stormIntensity}
        />
      </ThreeCanvas>

      {/* 2D Synchronized Kinetic Subtitles */}
      <KineticSubtitles />
    </AbsoluteFill>
  );
};

// ============================================================================
// Turnkey Remotion Root Export (1080x1920, 60fps, 1200 frames = 20 seconds)
// ============================================================================

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="NarratorCloudShort"
      component={NarratorCloudShort}
      durationInFrames={VIDEO_DURATION_IN_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};
