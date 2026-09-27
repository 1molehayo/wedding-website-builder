import type { ReactNode } from 'react'
import {
  CapsNames,
  DateLine,
  DateSplit,
  Hairline,
  InviteLine,
  ReceptionLine,
  StackedNames,
  VenueLines,
} from '@/components/invitation/invitation-facts'
import type { InvitationCardContent } from '@/components/invitation/invitation-facts'
import {
  ArchFrame,
  CanopyFrame,
  CornerBouquets,
  CrestShield,
  FacetFrame,
  FloralWreath,
  PaperWash,
  PinstripeRails,
  SealRing,
  SideGarlands,
} from '@/components/invitation/ornaments'
import { nameInitial } from '@/lib/invitation/designs'
import type { InvitationDesignId } from '@/lib/invitation/designs'

function CardShell({
  children,
  wash = false,
}: {
  children: ReactNode
  wash?: boolean
}) {
  return (
    <div className="relative h-full overflow-hidden">
      {wash ? <PaperWash /> : null}
      {children}
    </div>
  )
}

function OrnateStack({
  content,
  kicker,
  names = 'script',
  reception = true,
}: {
  content: InvitationCardContent
  kicker: string
  names?: 'script' | 'caps'
  reception?: boolean
}) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-58 flex-col items-center gap-4 text-center">
      <InviteLine className="text-[0.72rem]">{kicker}</InviteLine>
      {names === 'script' ? (
        <StackedNames
          groomName={content.groomName}
          brideName={content.brideName}
          className="text-[2.65rem]"
        />
      ) : (
        <CapsNames
          groomName={content.groomName}
          brideName={content.brideName}
          className="text-[1.85rem]"
        />
      )}
      <DateSplit weddingDate={content.weddingDate} prominent />
      <VenueLines
        venueName={content.venueName}
        venueLocation={content.venueLocation}
      />
      {reception ? <ReceptionLine /> : null}
    </div>
  )
}

function WreathCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell wash>
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-5 text-center">
        <InviteLine className="text-[0.72rem]">
          Please join us to celebrate
        </InviteLine>
        <FloralWreath>
          <StackedNames
            groomName={content.groomName}
            brideName={content.brideName}
            className="text-[1.85rem]"
          />
        </FloralWreath>
        <DateSplit weddingDate={content.weddingDate} prominent />
        <VenueLines
          venueName={content.venueName}
          venueLocation={content.venueLocation}
        />
      </div>
    </CardShell>
  )
}

function CornerBloomCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell wash>
      <CornerBouquets />
      <div className="flex h-full items-center justify-center px-6 py-24">
        <OrnateStack content={content} kicker="Together with their families" />
      </div>
    </CardShell>
  )
}

function ArchCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell wash>
      <ArchFrame />
      <CornerBouquets edges="top" />
      <div className="flex h-full items-center justify-center px-10 pt-40 pb-16">
        <OrnateStack content={content} kicker="The wedding of" />
      </div>
    </CardShell>
  )
}

function GarlandCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell wash>
      <SideGarlands />
      <div className="flex h-full items-center justify-center px-16 py-8">
        <OrnateStack
          content={content}
          kicker="Together with their families"
          names="caps"
        />
      </div>
    </CardShell>
  )
}

function FacetCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell wash>
      <FacetFrame />
      <CornerBouquets edges="diagonal" />
      <div className="flex h-full items-center justify-center px-12 py-24">
        <OrnateStack
          content={content}
          kicker="Request the pleasure of your company"
          reception={false}
        />
      </div>
    </CardShell>
  )
}

function LatticeCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell>
      <PinstripeRails />
      <div className="flex h-full items-center justify-center px-12 py-16">
        <OrnateStack
          content={content}
          kicker="Together with their families"
          names="caps"
        />
      </div>
    </CardShell>
  )
}

function CanopyCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell>
      <CanopyFrame />
      <div className="flex h-full items-center justify-center px-12 pt-36 pb-14">
        <OrnateStack
          content={content}
          kicker="You are invited to the wedding of"
        />
      </div>
    </CardShell>
  )
}

function CrestCard({ content }: { content: InvitationCardContent }) {
  const left = nameInitial(content.groomName)
  const right = nameInitial(content.brideName)

  return (
    <CardShell>
      <div className="flex h-full flex-col items-center justify-center gap-5 px-8 py-8 text-center">
        <div className="relative h-40 w-36 shrink-0">
          <CrestShield />
          <p className="font-serif absolute inset-x-[24%] top-[28%] bottom-[32%] flex items-center justify-center gap-1 text-lg tracking-[0.08em]">
            <span>{left}</span>
            <span className="text-highlight text-sm">&amp;</span>
            <span>{right}</span>
          </p>
        </div>
        <CapsNames
          groomName={content.groomName}
          brideName={content.brideName}
          className="text-[2rem]"
        />
        <Hairline className="w-16" />
        <DateSplit weddingDate={content.weddingDate} prominent />
        <VenueLines
          venueName={content.venueName}
          venueLocation={content.venueLocation}
        />
      </div>
    </CardShell>
  )
}

function SealCard({ content }: { content: InvitationCardContent }) {
  const left = nameInitial(content.groomName)
  const right = nameInitial(content.brideName)

  return (
    <CardShell wash>
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-6 text-center">
        <SealRing>
          <p className="font-serif text-xl tracking-[0.12em]">
            {left}
            <span className="text-highlight px-1 text-base">&amp;</span>
            {right}
          </p>
        </SealRing>
        <StackedNames
          groomName={content.groomName}
          brideName={content.brideName}
          className="text-[2.5rem]"
        />
        <DateSplit weddingDate={content.weddingDate} prominent />
        <VenueLines
          venueName={content.venueName}
          venueLocation={content.venueLocation}
        />
        <ReceptionLine />
      </div>
    </CardShell>
  )
}

function BandCard({ content }: { content: InvitationCardContent }) {
  const left = nameInitial(content.groomName)
  const right = nameInitial(content.brideName)

  return (
    <CardShell>
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-end px-8 pb-6 text-center">
          <StackedNames
            groomName={content.groomName}
            brideName={content.brideName}
            className="text-[2.75rem]"
          />
          <InviteLine className="mt-4 text-[0.72rem]">
            Invite you to their wedding
          </InviteLine>
        </div>
        <div className="bg-foreground text-background flex items-center justify-center gap-5 py-4">
          <span className="font-serif text-4xl italic">{left}</span>
          <span className="text-highlight font-serif text-xl italic">
            &amp;
          </span>
          <span className="font-serif text-4xl italic">{right}</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-start gap-4 px-8 pt-6 text-center">
          <DateSplit weddingDate={content.weddingDate} prominent />
          <VenueLines
            venueName={content.venueName}
            venueLocation={content.venueLocation}
          />
          <ReceptionLine />
        </div>
      </div>
    </CardShell>
  )
}

function EditorialCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell>
      <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
        <InviteLine>Together with their families</InviteLine>
        <StackedNames
          groomName={content.groomName}
          brideName={content.brideName}
          className="mt-5 text-5xl"
        />
        <Hairline className="mt-6 w-12" />
        <DateLine weddingDate={content.weddingDate} className="mt-5" />
        <VenueLines
          venueName={content.venueName}
          venueLocation={content.venueLocation}
          className="mt-3"
        />
        <ReceptionLine className="mt-4" />
      </div>
    </CardShell>
  )
}

function MastheadCard({ content }: { content: InvitationCardContent }) {
  return (
    <CardShell>
      <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
        <InviteLine className="tracking-[0.32em]">The wedding of</InviteLine>
        <Hairline className="mt-5 w-full max-w-56" />
        <CapsNames
          groomName={content.groomName}
          brideName={content.brideName}
          className="mt-5 text-4xl"
        />
        <Hairline className="mt-5 w-full max-w-56" />
        <DateLine weddingDate={content.weddingDate} className="mt-5" />
        <VenueLines
          venueName={content.venueName}
          venueLocation={content.venueLocation}
          className="mt-3"
        />
      </div>
    </CardShell>
  )
}

const CARDS: Record<
  InvitationDesignId,
  (props: { content: InvitationCardContent }) => ReactNode
> = {
  wreath: WreathCard,
  'corner-bloom': CornerBloomCard,
  arch: ArchCard,
  garland: GarlandCard,
  facet: FacetCard,
  lattice: LatticeCard,
  canopy: CanopyCard,
  crest: CrestCard,
  seal: SealCard,
  band: BandCard,
  editorial: EditorialCard,
  masthead: MastheadCard,
}

export function InvitationCard({
  design,
  content,
}: {
  design: InvitationDesignId
  content: InvitationCardContent
}) {
  const Card = CARDS[design]
  return <Card content={content} />
}

export type { InvitationCardContent }
