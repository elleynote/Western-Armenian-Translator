-- Tun identity and WooCommerce pending-entitlement foundation.
--
-- This migration is additive and provider-independent. Supabase Auth remains
-- the Translator's internal identity authority. TunApp/OIDC identities will be
-- linked to existing auth.users rows later, while WooCommerce remains the
-- subscription entitlement source of truth.


-- ============================================================
-- Verified Tun identity -> Supabase user mapping
-- ============================================================

create table if not exists public.tun_identity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  provider text not null default 'tunapp'
    check (provider = 'tunapp'),
  provider_subject text not null,
  wordpress_user_id bigint,
  woocommerce_customer_id bigint,
  email_at_link_time text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subject),
  unique (user_id, provider)
);

create unique index if not exists
  tun_identity_links_wordpress_user_unique_idx
on public.tun_identity_links (
  provider,
  wordpress_user_id
)
where wordpress_user_id is not null;

create unique index if not exists
  tun_identity_links_woocommerce_customer_unique_idx
on public.tun_identity_links (
  provider,
  woocommerce_customer_id
)
where woocommerce_customer_id is not null;

create index if not exists
  tun_identity_links_user_idx
on public.tun_identity_links (
  user_id
);

drop trigger if exists
  tun_identity_links_updated_at
on public.tun_identity_links;

create trigger tun_identity_links_updated_at
before update
on public.tun_identity_links
for each row
execute function public.set_updated_at();

alter table public.tun_identity_links
  enable row level security;

revoke all
on table public.tun_identity_links
from anon, authenticated;

grant all
on table public.tun_identity_links
to service_role;


-- ============================================================
-- Woo subscriptions received before a Supabase identity is linked
-- ============================================================

create table if not exists public.woocommerce_pending_entitlements (
  id uuid primary key default gen_random_uuid(),
  woocommerce_subscription_id bigint not null unique,
  woocommerce_order_id bigint,
  woocommerce_customer_id bigint,
  wordpress_user_id bigint,
  billing_email text,
  plan_id uuid not null
    references public.plans(id)
    on delete restrict,
  plan_slug text not null
    check (plan_slug in ('premium','business')),
  product_id bigint not null
    references public.woocommerce_product_plan_map(product_id)
    on delete restrict,
  status text not null,
  provider_updated_at timestamptz,
  linked_user_id uuid
    references auth.users(id)
    on delete set null,
  link_status text not null default 'pending'
    check (link_status in ('pending','linked','conflict')),
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  woocommerce_pending_entitlements_status_idx
on public.woocommerce_pending_entitlements (
  link_status,
  updated_at desc
);

create index if not exists
  woocommerce_pending_entitlements_wordpress_idx
on public.woocommerce_pending_entitlements (
  wordpress_user_id
)
where wordpress_user_id is not null;

create index if not exists
  woocommerce_pending_entitlements_customer_idx
on public.woocommerce_pending_entitlements (
  woocommerce_customer_id
)
where woocommerce_customer_id is not null;

create index if not exists
  woocommerce_pending_entitlements_linked_user_idx
on public.woocommerce_pending_entitlements (
  linked_user_id
)
where linked_user_id is not null;

drop trigger if exists
  woocommerce_pending_entitlements_updated_at
on public.woocommerce_pending_entitlements;

create trigger woocommerce_pending_entitlements_updated_at
before update
on public.woocommerce_pending_entitlements
for each row
execute function public.set_updated_at();

alter table public.woocommerce_pending_entitlements
  enable row level security;

revoke all
on table public.woocommerce_pending_entitlements
from anon, authenticated;

grant all
on table public.woocommerce_pending_entitlements
to service_role;

comment on table public.tun_identity_links is
  'Verified immutable Tun identity links to existing Supabase Auth users. Email is informational and must not be the permanent identity key.';

comment on table public.woocommerce_pending_entitlements is
  'Verified WooCommerce subscription state awaiting a trusted Tun-to-Supabase identity link.';
