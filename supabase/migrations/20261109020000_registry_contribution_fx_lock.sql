-- Lock the FX rate used for each contribution so remaining stays stable in the gift base currency.

alter table public.registry_contributions
  add column if not exists amount_base numeric(14, 2),
  add column if not exists base_currency text,
  add column if not exists fx_rate numeric(18, 8),
  add column if not exists fx_locked_at timestamptz,
  add column if not exists fx_source text;

comment on column public.registry_contributions.amount_base is
  'Contribution amount converted into the gift base currency using the locked fx_rate.';

comment on column public.registry_contributions.base_currency is
  'Gift (or donation) base currency at lock time. Remaining is tracked in this currency.';

comment on column public.registry_contributions.fx_rate is
  'Pay-currency units per 1 base-currency unit at lock time (e.g. 1346.61 NGN per 1 USD). 1 when currencies match.';

comment on column public.registry_contributions.fx_locked_at is
  'When the rate was snapshotted for this payment.';

comment on column public.registry_contributions.fx_source is
  'Rate provider id (frankfurter, open-er-api, same_currency).';

-- Existing rows: treat paid currency as base (no conversion was applied).
update public.registry_contributions
set
  amount_base = amount,
  base_currency = currency,
  fx_rate = 1,
  fx_locked_at = coalesce(fx_locked_at, created_at),
  fx_source = coalesce(fx_source, 'same_currency')
where amount_base is null
   or base_currency is null
   or fx_rate is null
   or fx_locked_at is null
   or fx_source is null;

alter table public.registry_contributions
  alter column amount_base set not null,
  alter column base_currency set not null,
  alter column fx_rate set not null,
  alter column fx_locked_at set not null,
  alter column fx_source set not null;

alter table public.registry_contributions
  drop constraint if exists registry_contributions_amount_base_positive,
  drop constraint if exists registry_contributions_base_currency_len,
  drop constraint if exists registry_contributions_fx_rate_positive;

alter table public.registry_contributions
  add constraint registry_contributions_amount_base_positive
    check (amount_base > 0),
  add constraint registry_contributions_base_currency_len
    check (
      char_length(base_currency) between 3 and 12
      and base_currency = upper(base_currency)
    ),
  add constraint registry_contributions_fx_rate_positive
    check (fx_rate > 0);
