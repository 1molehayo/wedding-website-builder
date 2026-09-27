import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const ROSE = '#c47d8a'
const ROSE_DEEP = '#8d4c5c'
const BLUSH = '#f0d0d2'
const CREAM = '#f7f1e6'
const GOLD = '#c4a574'
const GOLD_DEEP = '#9a7848'
const SAGE = '#8eae86'
const MOSS = '#5f7d58'
const LILAC = '#b09bc4'
const PLUM = '#6e5278'
const STEM = '#6d8b66'

function RoseMark({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <ellipse cx="0" cy="-11" rx="7" ry="10" fill={BLUSH} />
      <ellipse
        cx="10"
        cy="-4"
        rx="7"
        ry="10"
        transform="rotate(60)"
        fill={ROSE}
      />
      <ellipse
        cx="8"
        cy="8"
        rx="7"
        ry="10"
        transform="rotate(120)"
        fill={BLUSH}
      />
      <ellipse
        cx="-6"
        cy="9"
        rx="7"
        ry="10"
        transform="rotate(200)"
        fill={ROSE}
      />
      <ellipse
        cx="-11"
        cy="-2"
        rx="7"
        ry="10"
        transform="rotate(280)"
        fill={BLUSH}
      />
      <circle cx="0" cy="0" r="6" fill={ROSE_DEEP} />
      <circle cx="0" cy="0" r="2.5" fill={GOLD} />
    </g>
  )
}

function AnemoneMark({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      {[0, 51, 102, 153, 204, 255].map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="-10"
          rx="5"
          ry="9"
          transform={`rotate(${angle})`}
          fill={angle % 2 === 0 ? LILAC : CREAM}
        />
      ))}
      <circle cx="0" cy="0" r="4.5" fill={PLUM} />
      <circle cx="0" cy="0" r="1.6" fill={GOLD} />
    </g>
  )
}

function DaisyMark({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="-8"
          rx="3.2"
          ry="7"
          transform={`rotate(${angle})`}
          fill={CREAM}
          stroke={GOLD}
          strokeWidth="0.4"
        />
      ))}
      <circle cx="0" cy="0" r="3.2" fill={GOLD} />
    </g>
  )
}

function LeafMark({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path d="M0 16C8 8 10-2 0-14C-10-2-8 8 0 16Z" fill={SAGE} />
      <path d="M0 12V-8" stroke={MOSS} strokeWidth="0.7" />
    </g>
  )
}

function BudMark({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path d="M0 8C5 4 6-2 0-8C-6-2-5 4 0 8Z" fill={ROSE} />
      <path d="M-5 2C0 6 5 2 0 10C-4 6-2 4-5 2Z" fill={MOSS} />
    </g>
  )
}

function BouquetArt() {
  return (
    <svg viewBox="0 0 180 180" className="h-full w-full" aria-hidden>
      <path
        d="M18 150C40 110 28 70 70 48"
        fill="none"
        stroke={STEM}
        strokeWidth="1.4"
      />
      <LeafMark transform="translate(34 118) rotate(-40) scale(1.15)" />
      <LeafMark transform="translate(58 92) rotate(20) scale(1)" />
      <LeafMark transform="translate(22 78) rotate(-70) scale(0.9)" />
      <LeafMark transform="translate(78 58) rotate(50) scale(0.85)" />
      <RoseMark transform="translate(36 40) scale(1.35)" />
      <AnemoneMark transform="translate(78 34) scale(1.15)" />
      <DaisyMark transform="translate(28 86) scale(1.05)" />
      <RoseMark transform="translate(86 78) scale(0.85)" />
      <BudMark transform="translate(102 48) rotate(20) scale(1.1)" />
      <BudMark transform="translate(58 128) rotate(-30) scale(0.9)" />
    </svg>
  )
}

export function CornerBouquets({
  edges = 'all',
}: {
  edges?: 'all' | 'top' | 'diagonal'
}) {
  const corners = [
    'absolute -top-1 -left-1 size-32',
    'absolute -top-1 -right-1 size-32 -scale-x-100',
    'absolute -bottom-1 -left-1 size-32 -scale-y-100',
    'absolute -right-1 -bottom-1 size-32 -scale-100',
  ]
  const visible = {
    all: [true, true, true, true],
    top: [true, true, false, false],
    diagonal: [true, false, false, true],
  }[edges]

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {corners.map((className, index) =>
        visible[index] ? (
          <div key={className} className={className}>
            <BouquetArt />
          </div>
        ) : null,
      )}
    </div>
  )
}

const WREATH_SPOTS: {
  deg: number
  kind: 'rose' | 'anemone' | 'daisy' | 'leaf' | 'bud'
  scale: number
}[] = [
  { deg: -90, kind: 'rose', scale: 1.15 },
  { deg: -60, kind: 'leaf', scale: 0.85 },
  { deg: -30, kind: 'anemone', scale: 1 },
  { deg: 0, kind: 'daisy', scale: 0.95 },
  { deg: 30, kind: 'rose', scale: 1.05 },
  { deg: 60, kind: 'bud', scale: 0.9 },
  { deg: 90, kind: 'anemone', scale: 1.1 },
  { deg: 120, kind: 'leaf', scale: 0.85 },
  { deg: 150, kind: 'rose', scale: 1 },
  { deg: 180, kind: 'daisy', scale: 0.95 },
  { deg: 210, kind: 'bud', scale: 0.85 },
  { deg: 240, kind: 'anemone', scale: 1 },
]

function WreathSpot({
  deg,
  kind,
  scale,
}: {
  deg: number
  kind: 'rose' | 'anemone' | 'daisy' | 'leaf' | 'bud'
  scale: number
}) {
  const upright = kind === 'rose' || kind === 'anemone' || kind === 'daisy'
  const mark = {
    rose: <RoseMark transform={`scale(${scale})`} />,
    anemone: <AnemoneMark transform={`scale(${scale})`} />,
    daisy: <DaisyMark transform={`scale(${scale})`} />,
    leaf: <LeafMark transform={`scale(${scale})`} />,
    bud: <BudMark transform={`scale(${scale})`} />,
  }[kind]

  return (
    <div
      className="absolute top-1/2 left-1/2"
      style={{
        transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-7.35rem) rotate(${upright ? -deg : 0}deg)`,
      }}
    >
      <svg
        viewBox="-24 -24 48 48"
        className="size-12 overflow-visible"
        aria-hidden
      >
        {mark}
      </svg>
    </div>
  )
}

export function FloralWreath({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto size-76">
      {WREATH_SPOTS.map((spot) => (
        <WreathSpot key={spot.deg} {...spot} />
      ))}
      <div className="absolute inset-[22%] flex items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

export function SideGarlands() {
  const vine = (flip: boolean) => (
    <svg
      viewBox="0 0 90 420"
      className={cn(
        'pointer-events-none absolute top-6 bottom-6 w-24',
        flip ? 'right-0 -scale-x-100' : 'left-0',
      )}
      aria-hidden
    >
      <path
        d="M48 16c-10 40-6 70-18 100s2 70 12 110-8 80-16 120"
        fill="none"
        stroke={STEM}
        strokeWidth="1.5"
      />
      <RoseMark transform="translate(40 48) scale(1.05)" />
      <LeafMark transform="translate(28 100) rotate(-50) scale(1)" />
      <AnemoneMark transform="translate(36 160) scale(0.95)" />
      <LeafMark transform="translate(24 210) rotate(30) scale(0.9)" />
      <DaisyMark transform="translate(40 270) scale(0.9)" />
      <BudMark transform="translate(30 330) rotate(-20) scale(1)" />
      <RoseMark transform="translate(42 380) scale(0.85)" />
    </svg>
  )

  return (
    <>
      {vine(false)}
      {vine(true)}
    </>
  )
}

export function ArchFrame() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-6 top-4 bottom-16 rounded-t-[12rem] border-x-2 border-t-2"
      style={{ borderColor: GOLD }}
    />
  )
}

export function CanopyFrame() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-3 bottom-3 rounded-t-[12rem] border-2"
        style={{ borderColor: GOLD }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-5 bottom-5 rounded-t-[11rem] border"
        style={{ borderColor: ROSE }}
      />
    </>
  )
}

export function FacetFrame() {
  return (
    <svg
      viewBox="0 0 300 520"
      className="pointer-events-none absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]"
      fill="none"
      aria-hidden
    >
      <path
        d="M150 8 270 78v364L150 512 30 442V78Z"
        stroke={GOLD}
        strokeWidth="2.2"
      />
      <path
        d="M150 24 254 90v340L150 496 46 430V90Z"
        stroke={ROSE}
        strokeWidth="1.2"
      />
      <path
        d="M150 8 150 24M270 78 254 90M30 78 46 90M270 442 254 430M30 442 46 430M150 512 150 496"
        stroke={GOLD_DEEP}
        strokeWidth="0.8"
      />
    </svg>
  )
}

export function PinstripeRails() {
  const rail: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(90deg, ${GOLD} 0 1px, transparent 1px 5px)`,
  }

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-5 left-3 w-4"
        style={rail}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-5 right-3 w-4"
        style={rail}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-6 border-2"
        style={{ borderColor: GOLD }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-8 border"
        style={{ borderColor: ROSE }}
      />
    </>
  )
}

export function CrestShield() {
  return (
    <svg viewBox="0 0 160 184" className="h-full w-full" aria-hidden>
      <path
        d="M80 10 146 32v58c0 42-28 68-66 82C42 158 14 132 14 90V32Z"
        fill="none"
        stroke={GOLD}
        strokeWidth="3"
      />
      <path
        d="M80 26 132 44v44c0 34-22 54-52 66-30-12-52-32-52-66V44Z"
        fill="none"
        stroke={ROSE}
        strokeWidth="1.2"
      />
    </svg>
  )
}

export function SealRing({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 160 160" className="absolute inset-0" aria-hidden>
        <circle
          cx="80"
          cy="80"
          r="54"
          fill="none"
          stroke={GOLD}
          strokeWidth="3"
        />
        <circle
          cx="80"
          cy="80"
          r="46"
          fill="none"
          stroke={ROSE}
          strokeWidth="1.2"
        />
      </svg>
      <svg
        viewBox="-80 -80 160 160"
        className="absolute inset-0 overflow-visible"
        aria-hidden
      >
        <RoseMark transform="translate(0 -70) scale(0.62)" />
        <DaisyMark transform="translate(60 -36) scale(0.5)" />
        <AnemoneMark transform="translate(60 36) scale(0.55)" />
        <RoseMark transform="translate(0 70) scale(0.55)" />
        <DaisyMark transform="translate(-60 36) scale(0.5)" />
        <AnemoneMark transform="translate(-60 -36) scale(0.55)" />
      </svg>
      <div className="absolute inset-[30%] flex items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

export function PaperWash() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse at 0% 0%, color-mix(in oklab, ${BLUSH} 55%, transparent), transparent 42%),
          radial-gradient(ellipse at 100% 100%, color-mix(in oklab, ${SAGE} 35%, transparent), transparent 46%)
        `,
      }}
    />
  )
}
