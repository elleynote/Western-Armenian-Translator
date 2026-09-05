-- Client-approved exact translations for the English greeting "Hello".
-- These rows use the existing approved translation-memory fast path so the
-- translator returns the requested Armenian variety without an OpenAI round trip.

insert into public.approved_translation_examples (
  source_language,
  target_language,
  source_text,
  translated_text,
  category,
  notes,
  source_name,
  copyright_status,
  commercial_use_allowed,
  approved,
  approved_at
)
values
  (
    'en', 'hyw', 'Hello', 'Բարեւ',
    'greeting',
    'Client-approved Western Armenian translation for Hello.',
    'Client approved',
    'client-provided',
    true,
    true,
    now()
  ),
  (
    'en', 'hye', 'Hello', 'Բարև ձեզ',
    'greeting',
    'Client-approved Eastern Armenian translation for Hello.',
    'Client approved',
    'client-provided',
    true,
    true,
    now()
  )
on conflict (source_language, target_language, source_text)
do update set
  translated_text = excluded.translated_text,
  category = excluded.category,
  notes = excluded.notes,
  source_name = excluded.source_name,
  copyright_status = excluded.copyright_status,
  commercial_use_allowed = true,
  approved = true,
  approved_at = coalesce(public.approved_translation_examples.approved_at, now()),
  updated_at = now();
