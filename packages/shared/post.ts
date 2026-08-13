/**
 * How long a caption may be.
 *
 * Shared because three places have to agree on it: the route that publishes a
 * post, the route an admin edits one from, and the textarea they type into.
 */
export const POST_CAPTION_MAX_LENGTH = 2000

/**
 * Where a publicly shared post lives.
 *
 * Shared because three places have to agree on it: the page that renders a
 * shared post, the modal that hands someone the link to copy, and the canonical
 * URL in the page's own metadata — which is the address search engines and chat
 * apps will remember it by. Short on purpose: this is the one URL in the app
 * that gets pasted into a group chat.
 */
export const sharePath = (postId: string) => `/p/${postId}`
