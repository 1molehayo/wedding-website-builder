import type { PageBlock } from '@/lib/page-blocks/types'

export type WeddingStatus =
  'planning' | 'date_confirmed' | 'invitations_sent' | 'completed'

export type PublicThemeId = 'celeste' | 'botanica' | 'rosewater' | 'nocturne'

export type AdminRole = 'super_admin' | 'admin'

export type RsvpStatus = 'pending' | 'attending' | 'declined'

export type FeedbackCategory = 'general' | 'bug' | 'idea' | 'praise'

export type FeedbackStatus = 'new' | 'planned' | 'done' | 'dismissed'

export type ProductFeedback = {
  id: string
  admin_profile_id: string
  wedding_id: string | null
  category: FeedbackCategory
  message: string
  page_path: string | null
  status: FeedbackStatus
  created_at: string
  updated_at: string
}

export type DonationThanks = {
  id: string
  admin_profile_id: string
  wedding_id: string | null
  donor_name: string
  donor_email: string
  message: string | null
  created_at: string
}

export type Wedding = {
  id: string
  groom_name: string
  bride_name: string
  wedding_date: string | null
  /** When set with wedding_date, the date is public. Null = TBA on the site. */
  date_published_at: string | null
  status: WeddingStatus
  venue_name: string | null
  venue_location: string | null
  dress_code: string | null
  /** Public site strip; null/empty hides the bar. */
  announcement_text: string | null
  active_public_theme: PublicThemeId
  public_slug: string
  /** Selected e-invitation catalog id (e.g. wreath). */
  invitation_design_id: string
  /** light | dark card rendering for preview and email. */
  invitation_design_mode: 'light' | 'dark'
  /** photos bucket path for the rendered invitation PNG, if generated. */
  invitation_card_path: string | null
  page_blocks: PageBlock[]
  page_blocks_draft: PageBlock[]
  page_draft_updated_at: string | null
  page_published_at: string | null
  created_at: string
  updated_at: string
}

export type RegistryItemStatus = 'available' | 'reserved' | 'purchased'

export type RegistryContributionChannel = 'bank_transfer' | 'external_store'

export type RegistryContributionStatus = 'pending' | 'received' | 'not_received'

export type ActivityActorRole = 'admin' | 'super_admin' | 'guest' | 'system'

export type RegistryItem = {
  id: string
  wedding_id: string
  title: string
  description: string | null
  /** Optional browse link. Not a payment URL. */
  store_url: string | null
  /** Photos bucket path for the gift image. */
  photo_path: string | null
  price_label: string | null
  desired_qty: number
  claimed_qty: number
  status: RegistryItemStatus
  sort_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

export type RegistryItemPrice = {
  id: string
  item_id: string
  wedding_id: string
  currency: string
  amount: number
  created_at: string
  updated_at: string
}

export type RegistryItemListing = {
  id: string
  item_id: string
  wedding_id: string
  provider: string
  url: string
  label: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type RegistryContribution = {
  id: string
  wedding_id: string
  gift_id: string | null
  channel: RegistryContributionChannel
  provider: string | null
  amount: number
  currency: string
  /** Amount in base_currency using the locked fx_rate. */
  amount_base: number
  base_currency: string
  /** Pay-currency units per 1 base unit at lock time. */
  fx_rate: number
  fx_locked_at: string
  fx_source: string
  payer_name: string
  payer_email: string
  payer_phone: string | null
  status: RegistryContributionStatus
  applied_at: string | null
  external_ref: string | null
  listing_url: string | null
  created_at: string
  updated_at: string
}

/** Bank-only row. confirm_token is server-only and omitted from this type. */
export type RegistryContributionBank = {
  contribution_id: string
  account_id: string
  reference: string
  reminder_count: number
  last_reminder_at: string | null
  created_at: string
  updated_at: string
}

export type ActivityLog = {
  id: string
  wedding_id: string | null
  actor_id: string | null
  actor_email: string | null
  actor_role: ActivityActorRole
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  metadata: Record<string, unknown>
  created_at: string
}

export type RegistryAccount = {
  id: string
  wedding_id: string
  label: string
  bank_name: string | null
  currency: string
  account_name: string
  account_number: string
  routing_number: string | null
  notes: string | null
  sort_order: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export type RegistryReservation = {
  id: string
  wedding_id: string
  item_id: string
  guest_name: string | null
  quantity: number
  created_at: string
}

export type AdminProfile = {
  id: string
  wedding_id: string | null
  /** @deprecated Prefer first_name — kept in sync for legacy reads. */
  display_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  role: AdminRole
  deletion_requested_at: string | null
  deletion_reason: string | null
  invite_token: string | null
  invited_at: string | null
  invite_accepted_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export type ArchivedAdmin = {
  id: string
  original_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  phone: string | null
  role: AdminRole
  wedding_id: string | null
  deletion_requested_at: string | null
  deletion_reason: string | null
  invite_token: string | null
  invited_at: string | null
  invite_accepted_at: string | null
  cancelled_at: string | null
  profile_created_at: string | null
  profile_updated_at: string | null
  archived_at: string
  archived_by: string | null
  archive_reason: string | null
}

export type Guest = {
  id: string
  wedding_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  party_name: string | null
  plus_ones: number
  notes: string | null
  admin_label: string | null
  rsvp_token: string
  rsvp_status: RsvpStatus
  rsvp_responded_at: string | null
  attending_count: number | null
  dietary_notes: string | null
  rsvp_message: string | null
  allow_rsvp_update: boolean
  invite_emailed_at: string | null
  created_at: string
  updated_at: string
}

export type MediaAsset = {
  id: string
  wedding_id: string
  storage_path: string
  filename: string
  content_type: string | null
  byte_size: number | null
  created_by: string | null
  created_at: string
}

export type PhotoShareGroup = {
  id: string
  wedding_id: string
  name: string
  share_token: string
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      weddings: {
        Row: Wedding
        Insert: Partial<Wedding> & {
          groom_name: string
          bride_name: string
        }
        Update: Partial<Wedding>
      }
      admin_profiles: {
        Row: AdminProfile
        Insert: {
          id: string
          wedding_id?: string | null
          display_name?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          email?: string | null
          role?: AdminRole
          deletion_requested_at?: string | null
          deletion_reason?: string | null
          invite_token?: string | null
          invited_at?: string | null
          invite_accepted_at?: string | null
          cancelled_at?: string | null
        }
        Update: Partial<AdminProfile>
      }
      archived_admins: {
        Row: ArchivedAdmin
        Insert: {
          original_user_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          phone?: string | null
          role?: AdminRole
          wedding_id?: string | null
          deletion_requested_at?: string | null
          deletion_reason?: string | null
          invite_token?: string | null
          invited_at?: string | null
          invite_accepted_at?: string | null
          cancelled_at?: string | null
          profile_created_at?: string | null
          profile_updated_at?: string | null
          archived_by?: string | null
          archive_reason?: string | null
        }
        Update: Partial<ArchivedAdmin>
      }
      guests: {
        Row: Guest
        Insert: {
          wedding_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          party_name?: string | null
          plus_ones?: number
          notes?: string | null
          admin_label?: string | null
          rsvp_token?: string
          rsvp_status?: RsvpStatus
          rsvp_responded_at?: string | null
          attending_count?: number | null
          dietary_notes?: string | null
          rsvp_message?: string | null
          allow_rsvp_update?: boolean
        }
        Update: Partial<
          Omit<Guest, 'id' | 'wedding_id' | 'created_at' | 'updated_at'>
        >
      }
      product_feedback: {
        Row: ProductFeedback
        Insert: {
          admin_profile_id: string
          wedding_id?: string | null
          category?: FeedbackCategory
          message: string
          page_path?: string | null
          status?: FeedbackStatus
        }
        Update: Partial<
          Omit<ProductFeedback, 'id' | 'created_at' | 'updated_at'>
        >
      }
      donation_thanks: {
        Row: DonationThanks
        Insert: {
          admin_profile_id: string
          wedding_id?: string | null
          donor_name: string
          donor_email: string
          message?: string | null
        }
        Update: Partial<Omit<DonationThanks, 'id' | 'created_at'>>
      }
      media_assets: {
        Row: MediaAsset
        Insert: {
          wedding_id: string
          storage_path: string
          filename: string
          content_type?: string | null
          byte_size?: number | null
          created_by?: string | null
        }
        Update: Partial<Omit<MediaAsset, 'id' | 'wedding_id' | 'created_at'>>
      }
      photo_share_groups: {
        Row: PhotoShareGroup
        Insert: {
          wedding_id: string
          name: string
          share_token: string
        }
        Update: Partial<
          Omit<
            PhotoShareGroup,
            'id' | 'wedding_id' | 'created_at' | 'updated_at'
          >
        >
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}
