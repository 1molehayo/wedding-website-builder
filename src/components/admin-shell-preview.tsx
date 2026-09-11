import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  ADMIN_PREVIEW_NAV_LABELS,
  PRODUCT_SHORT_NAME,
  PRODUCT_TAGLINE,
} from '@/lib/constants'

/** Static Ournuptials-inspired admin shell for the design showcase (not auth-gated). */
export function AdminShellPreview() {
  return (
    <div
      data-surface="admin"
      className="border-border overflow-hidden rounded-2xl border shadow-sm"
    >
      <div className="grid min-h-112 md:grid-cols-[14rem_1fr]">
        <aside className="bg-sidebar text-sidebar-foreground flex flex-col gap-6 p-4">
          <div>
            <p className="font-serif text-xl italic">{PRODUCT_SHORT_NAME}</p>
            <p className="text-sidebar-foreground/60 mt-1 text-[0.65rem] tracking-[0.2em] uppercase">
              {PRODUCT_TAGLINE}
            </p>
          </div>
          <nav className="flex flex-col gap-1 text-sm">
            {ADMIN_PREVIEW_NAV_LABELS.map((item, index) => (
              <div
                key={item}
                className={
                  index === 0
                    ? 'bg-accent/25 text-sidebar-foreground rounded-lg px-3 py-2'
                    : 'text-sidebar-foreground/70 px-3 py-2'
                }
              >
                {item}
              </div>
            ))}
          </nav>
          <div className="mt-auto border-t border-white/10 pt-4 text-sm">
            <p className="font-serif italic">Marvelous &amp; Lillian</p>
            <p className="text-sidebar-foreground/60 mt-1 text-xs">
              Date to be announced
            </p>
          </div>
        </aside>

        <div className="bg-background text-foreground p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <h2 className="admin-page-title">Website</h2>
            <Badge variant="neutral">Admin preview</Badge>
          </div>

          <div className="bg-surface border-border space-y-4 rounded-xl border p-5">
            <p className="text-foreground-secondary text-sm">
              Foundations components with admin tokens (cream surface, dark
              sidebar, champagne accent). Live settings live under Admin →
              Wedding settings.
            </p>
            <Field>
              <Field.Label>Active public theme</Field.Label>
              <Field.Control>
                <Input defaultValue="Celeste" readOnly />
              </Field.Control>
              <Field.Description>
                Admin chooses one theme for the public site; visitors only
                toggle light/dark.
              </Field.Description>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Save changes</Button>
              <Button size="sm" variant="outline">
                Preview website
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
