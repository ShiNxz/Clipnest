/**
 * The site's own name, as shipped.
 *
 * It's only a fallback: the real title lives in the `settings` row and is
 * edited from /admin, so one deploy can be "Clipnest" and the next can be
 * dedicated to a single group — or a single party — without a rebuild. These
 * constants are what a fresh database starts with, and what the site falls back
 * to when the API can't be reached.
 */
export const DEFAULT_SITE_TITLE = 'Clipnest'

export const DEFAULT_SITE_DESCRIPTION = 'Clips and memes, between friends.'

/** Kept short on purpose — it has to fit a browser tab and the header. */
export const SITE_TITLE_MAX_LENGTH = 60

/** Google truncates meta descriptions past roughly this, so don't invite more. */
export const SITE_DESCRIPTION_MAX_LENGTH = 160
