-- TunApp SSO identity reconciliation.
--
-- Supabase Auth remains the Translator identity/session authority. This RPC is
-- service-role only and links an already-verified Tun OAuth provider subject to
-- the Stage 1 WooCommerce pending-entitlement foundation in one DB transaction.

create or replace function public.reconcile_tun_identity(
  p_user_id uuid,
  p_provider_subject text,
  p_wordpress_user_id bigint,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
  v_link_subject text;
  v_link_wordpress_user_id bigint;
  v_link_customer_id bigint;
  v_conflicting_user uuid;
  v_pending public.woocommerce_pending_entitlements%rowtype;
  v_existing_subscription public.subscriptions%rowtype;
  v_free_plan_id uuid;
  v_target_plan_id uuid;
  v_entitlement_linked boolean := false;
  v_effective_plan jsonb;
begin
  if p_user_id is null then
    raise exception 'TUN_SSO_INVALID_USER';
  end if;

  if p_wordpress_user_id is null
     or p_wordpress_user_id <= 0
     or p_provider_subject is null
     or btrim(p_provider_subject) = ''
     or btrim(p_provider_subject) <> p_wordpress_user_id::text
  then
    raise exception 'TUN_SSO_INVALID_SUBJECT';
  end if;

  if not exists (
    select 1 from auth.users where id = p_user_id
  ) then
    raise exception 'TUN_SSO_INVALID_USER';
  end if;

  -- Serialize attempts to link the same immutable Tun subject.
  perform pg_advisory_xact_lock(
    hashtextextended('tunapp:' || btrim(p_provider_subject), 0)
  );

  select user_id
    into v_conflicting_user
  from public.tun_identity_links
  where provider = 'tunapp'
    and (
      provider_subject = btrim(p_provider_subject)
      or wordpress_user_id = p_wordpress_user_id
    )
    and user_id <> p_user_id
  limit 1
  for update;

  if v_conflicting_user is not null then
    raise exception 'TUN_SSO_IDENTITY_CONFLICT';
  end if;

  select id, provider_subject, wordpress_user_id, woocommerce_customer_id
    into v_link_id, v_link_subject, v_link_wordpress_user_id, v_link_customer_id
  from public.tun_identity_links
  where provider = 'tunapp'
    and user_id = p_user_id
  limit 1
  for update;

  if v_link_id is not null then
    if v_link_subject <> btrim(p_provider_subject)
       or (
         v_link_wordpress_user_id is not null
         and v_link_wordpress_user_id <> p_wordpress_user_id
       )
    then
      raise exception 'TUN_SSO_IDENTITY_CONFLICT';
    end if;

    update public.tun_identity_links
    set provider_subject = btrim(p_provider_subject),
        wordpress_user_id = p_wordpress_user_id,
        email_at_link_time = nullif(lower(btrim(coalesce(p_email, ''))), ''),
        last_verified_at = now(),
        updated_at = now()
    where id = v_link_id;
  else
    insert into public.tun_identity_links (
      user_id,
      provider,
      provider_subject,
      wordpress_user_id,
      email_at_link_time,
      last_verified_at
    )
    values (
      p_user_id,
      'tunapp',
      btrim(p_provider_subject),
      p_wordpress_user_id,
      nullif(lower(btrim(coalesce(p_email, ''))), ''),
      now()
    )
    returning id, woocommerce_customer_id
      into v_link_id, v_link_customer_id;
  end if;

  -- Prefer the newest verified Woo event for this WordPress account. Conflict
  -- rows stay untouched: they require manual investigation rather than an
  -- automatic identity merge.
  select pending.*
    into v_pending
  from public.woocommerce_pending_entitlements as pending
  where pending.link_status = 'pending'
    and pending.linked_user_id is null
    and pending.wordpress_user_id = p_wordpress_user_id
  order by
    pending.provider_updated_at desc nulls last,
    pending.updated_at desc
  limit 1
  for update;

  -- A previously known Woo customer link is a secondary unambiguous match.
  if v_pending.id is null and v_link_customer_id is not null then
    select pending.*
      into v_pending
    from public.woocommerce_pending_entitlements as pending
    where pending.link_status = 'pending'
      and pending.linked_user_id is null
      and pending.woocommerce_customer_id = v_link_customer_id
    order by
      pending.provider_updated_at desc nulls last,
      pending.updated_at desc
    limit 1
    for update;
  end if;

  if v_pending.id is not null then
    if v_pending.woocommerce_customer_id is not null then
      select user_id
        into v_conflicting_user
      from public.tun_identity_links
      where provider = 'tunapp'
        and woocommerce_customer_id = v_pending.woocommerce_customer_id
        and user_id <> p_user_id
      limit 1
      for update;

      if v_conflicting_user is not null then
        raise exception 'TUN_SSO_CUSTOMER_CONFLICT';
      end if;

      update public.tun_identity_links
      set woocommerce_customer_id = v_pending.woocommerce_customer_id,
          updated_at = now()
      where id = v_link_id
        and (
          woocommerce_customer_id is null
          or woocommerce_customer_id = v_pending.woocommerce_customer_id
        );
    end if;

    select *
      into v_existing_subscription
    from public.subscriptions
    where user_id = p_user_id
    for update;

    insert into public.subscriptions (
      user_id,
      plan_id,
      plan_slug,
      billing_provider,
      status,
      woocommerce_subscription_id,
      woocommerce_order_id,
      woocommerce_customer_id,
      woocommerce_product_id,
      woocommerce_billing_email,
      cancel_at_period_end,
      access_suspended,
      access_suspended_reason,
      provider_updated_at,
      synced_at,
      metadata
    )
    values (
      p_user_id,
      v_pending.plan_id,
      v_pending.plan_slug,
      'woocommerce',
      v_pending.status,
      v_pending.woocommerce_subscription_id,
      v_pending.woocommerce_order_id,
      v_pending.woocommerce_customer_id,
      v_pending.product_id,
      v_pending.billing_email,
      v_pending.status = 'pending-cancel',
      coalesce(v_existing_subscription.access_suspended, false),
      v_existing_subscription.access_suspended_reason,
      coalesce(v_pending.provider_updated_at, now()),
      now(),
      coalesce(v_existing_subscription.metadata, '{}'::jsonb)
        || coalesce(v_pending.metadata, '{}'::jsonb)
        || jsonb_build_object('account_link', 'tun_sso_reconcile')
    )
    on conflict (user_id) do update set
      plan_id = excluded.plan_id,
      plan_slug = excluded.plan_slug,
      billing_provider = 'woocommerce',
      status = excluded.status,
      woocommerce_subscription_id = excluded.woocommerce_subscription_id,
      woocommerce_order_id = excluded.woocommerce_order_id,
      woocommerce_customer_id = excluded.woocommerce_customer_id,
      woocommerce_product_id = excluded.woocommerce_product_id,
      woocommerce_billing_email = excluded.woocommerce_billing_email,
      cancel_at_period_end = excluded.cancel_at_period_end,
      provider_updated_at = excluded.provider_updated_at,
      synced_at = now(),
      metadata = coalesce(public.subscriptions.metadata, '{}'::jsonb)
        || excluded.metadata,
      updated_at = now();

    update public.woocommerce_pending_entitlements
    set linked_user_id = p_user_id,
        link_status = 'linked',
        last_error = null,
        updated_at = now()
    where link_status = 'pending'
      and linked_user_id is null
      and (
        wordpress_user_id = p_wordpress_user_id
        or (
          v_pending.woocommerce_customer_id is not null
          and woocommerce_customer_id = v_pending.woocommerce_customer_id
        )
      );

    v_entitlement_linked := true;
  end if;

  select id
    into v_free_plan_id
  from public.plans
  where slug = 'free'
  limit 1;

  if v_pending.id is not null and v_pending.status = 'active' then
    v_target_plan_id := v_pending.plan_id;
  else
    -- OAuth identity alone never grants paid access. If no pending event was
    -- linked, preserve an already-verified Woo subscription's active state;
    -- otherwise the account remains Free.
    select case
      when subscription.billing_provider = 'woocommerce'
       and subscription.status = 'active'
      then subscription.plan_id
      else v_free_plan_id
    end
      into v_target_plan_id
    from public.subscriptions as subscription
    where subscription.user_id = p_user_id;

    v_target_plan_id := coalesce(v_target_plan_id, v_free_plan_id);
  end if;

  if v_target_plan_id is not null then
    update public.profiles
    set current_plan_id = v_target_plan_id,
        updated_at = now()
    where id = p_user_id;
  end if;

  v_effective_plan := public.effective_plan_for_user(p_user_id);

  return jsonb_build_object(
    'linked', true,
    'entitlement_linked', v_entitlement_linked,
    'status', case when v_pending.id is null then null else v_pending.status end,
    'woocommerce_subscription_id', case when v_pending.id is null then null else v_pending.woocommerce_subscription_id end,
    'plan', v_effective_plan
  );
exception
  when unique_violation then
    raise exception 'TUN_SSO_IDENTITY_CONFLICT';
end;
$$;

revoke all
on function public.reconcile_tun_identity(uuid, text, bigint, text)
from public, anon, authenticated;

grant execute
on function public.reconcile_tun_identity(uuid, text, bigint, text)
to service_role;

comment on function public.reconcile_tun_identity(uuid, text, bigint, text) is
  'Service-role-only atomic reconciliation of a verified Tun OAuth subject with WooCommerce entitlement state.';
