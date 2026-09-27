export const INVITATION_CATEGORIES = [
  { id: 'floral', label: 'Floral' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'classic', label: 'Classic' },
  { id: 'editorial', label: 'Editorial' },
] as const

export const INVITATION_COMPOSITIONS = [
  { id: 'floral', label: 'Floral' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'acrylic', label: 'Acrylic' },
  { id: 'cursive', label: 'Cursive' },
  { id: 'monogram', label: 'Monogram' },
  { id: 'arch', label: 'Arch' },
  { id: 'wreath', label: 'Wreath' },
  { id: 'letterpress', label: 'Letterpress' },
  { id: 'border', label: 'Border' },
] as const

export type InvitationCategory = (typeof INVITATION_CATEGORIES)[number]['id']
export type InvitationComposition =
  (typeof INVITATION_COMPOSITIONS)[number]['id']
export type InvitationCategoryFilter = 'all' | InvitationCategory

export const INVITATION_DESIGNS = [
  {
    id: 'wreath',
    name: 'Wreath',
    description: 'Names inside a ring of leaves, with the date and venue below.',
    categories: ['floral', 'classic'],
    compositions: ['floral', 'wreath', 'cursive'],
  },
  {
    id: 'corner-bloom',
    name: 'Corner bloom',
    description: 'Sprigs in the corners around a centered date.',
    categories: ['floral'],
    compositions: ['floral', 'border'],
  },
  {
    id: 'arch',
    name: 'Arch',
    description: 'A tall arch over script names, date, and venue.',
    categories: ['floral', 'classic'],
    compositions: ['floral', 'arch', 'cursive'],
  },
  {
    id: 'garland',
    name: 'Garland',
    description: 'Vines along the sides and a floral foot.',
    categories: ['floral'],
    compositions: ['floral', 'border'],
  },
  {
    id: 'facet',
    name: 'Facet',
    description: 'A gemstone frame with small floral corners.',
    categories: ['geometric', 'floral'],
    compositions: ['geometric', 'acrylic', 'floral'],
  },
  {
    id: 'lattice',
    name: 'Lattice',
    description: 'Pinstriped sides and a double rule, set like letterpress.',
    categories: ['geometric', 'classic'],
    compositions: ['geometric', 'letterpress', 'border'],
  },
  {
    id: 'canopy',
    name: 'Canopy',
    description: 'A solid arch panel with script names and the date in columns.',
    categories: ['classic'],
    compositions: ['arch', 'cursive'],
  },
  {
    id: 'crest',
    name: 'Crest',
    description: 'Initials in a shield, then the names, date, and venue.',
    categories: ['classic', 'geometric'],
    compositions: ['monogram', 'geometric'],
  },
  {
    id: 'seal',
    name: 'Seal',
    description: 'A round monogram, then script names and the wedding facts.',
    categories: ['classic'],
    compositions: ['monogram', 'cursive'],
  },
  {
    id: 'band',
    name: 'Band',
    description: 'A belly band of initials across the middle of the card.',
    categories: ['classic', 'editorial'],
    compositions: ['monogram', 'letterpress'],
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Type only. Large names, a fine rule, date, and venue.',
    categories: ['editorial'],
    compositions: ['cursive'],
  },
  {
    id: 'masthead',
    name: 'Masthead',
    description: 'A small kicker, large names, and one line of facts.',
    categories: ['editorial'],
    compositions: ['letterpress'],
  },
] as const

export type InvitationDesign = (typeof INVITATION_DESIGNS)[number]
export type InvitationDesignId = InvitationDesign['id']

export function isInvitationDesignId(
  value: string,
): value is InvitationDesignId {
  return INVITATION_DESIGNS.some((design) => design.id === value)
}

export function categoryLabel(id: InvitationCategory): string {
  return (
    INVITATION_CATEGORIES.find((category) => category.id === id)?.label ?? id
  )
}

export function compositionLabel(id: InvitationComposition): string {
  return (
    INVITATION_COMPOSITIONS.find((composition) => composition.id === id)
      ?.label ?? id
  )
}

/** First letter of a name, for monogram marks. */
export function nameInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '·'
  return Array.from(trimmed)[0]?.toUpperCase() ?? '·'
}

export function filterInvitationDesigns(
  category: InvitationCategoryFilter,
  query: string,
): InvitationDesign[] {
  const needle = query.trim().toLowerCase()

  return INVITATION_DESIGNS.filter((design) => {
    if (
      category !== 'all' &&
      !design.categories.some((id) => id === category)
    ) {
      return false
    }
    if (!needle) return true

    const haystack = [
      design.name,
      ...design.compositions.map((id) => compositionLabel(id)),
      ...design.categories.map((id) => categoryLabel(id)),
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(needle)
  })
}
