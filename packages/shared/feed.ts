/**
 * The orders the feed can be read in.
 *
 * Shared because both ends need the same list: the API validates the `sort`
 * query against it, and the dropdown on the feed is built from it, so a new
 * order is added in one place. The first entry is the default — a clip someone
 * just posted has to be the first thing anyone sees.
 */
export const FEED_SORTS = ['recent', 'liked', 'commented', 'oldest'] as const

export type FeedSort = (typeof FEED_SORTS)[number]

export const DEFAULT_FEED_SORT = FEED_SORTS[0]

/** What each order is called in the dropdown. */
export const FEED_SORT_LABELS: Record<FeedSort, string> = {
	recent: 'Recently uploaded',
	liked: 'Most liked',
	commented: 'Most commented',
	oldest: 'Oldest first',
}

/**
 * How a thread reads: the best-liked first, and ties broken by who said it
 * first — so an unliked thread still reads as a conversation, top to bottom.
 *
 * Shared because both ends sort: the API orders what it sends, and the thread
 * re-orders itself the moment a like lands, before the server has answered.
 * `createdAt` arrives as a Date on the server and a string over the wire.
 */
export const byTopComments = (
	a: { likeCount: number; createdAt: Date | string },
	b: { likeCount: number; createdAt: Date | string }
) => b.likeCount - a.likeCount || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
