import eden from '@/utils/eden'
import useAuth from '@/utils/useAuth'
import { DEFAULT_FEED_SORT, type FeedSort } from 'shared'
import { mutate as globalMutate } from 'swr'
import useSWRInfinite, { unstable_serialize } from 'swr/infinite'

type FeedPage = NonNullable<Awaited<ReturnType<typeof eden.posts.index.get>>['data']>

export type Post = FeedPage['items'][number]
export type Liker = Post['likers'][number]
export type Comment = Post['comments'][number]

const PAGE_SIZE = 12

/**
 * Each order is its own cache entry — its cursors only mean anything inside it.
 *
 * Shared with `prependToFeed`, which has to address the same entry.
 */
const feedKey = (sort: FeedSort) => (index: number, previous: FeedPage | null) => {
	// A null cursor on a loaded page means there's nothing left after it.
	if (previous && !previous.nextCursor) return null
	return ['feed', sort, index === 0 ? null : previous?.nextCursor] as const
}

/**
 * The feed, paged, in one of the orders the API offers.
 *
 * Keyset cursors mean each page asks for "whatever comes after the last thing I
 * have" in that order, so liking or posting while someone scrolls never
 * duplicates or skips an item.
 *
 * Changing the order changes the cache key, and the previous order is
 * deliberately not held on screen while the new one loads (no
 * `keepPreviousData`): it would show the old sequence under the new label — the
 * one thing the control exists to change — and the scroll sentinel would page
 * against a list that doesn't match the cursors behind it.
 */
const useFeed = (sort: FeedSort = DEFAULT_FEED_SORT) => {
	const { data: me } = useAuth()

	const query = useSWRInfinite<FeedPage>(
		feedKey(sort),
		async ([, sort, cursor]) => {
			const { data, error } = await eden.posts.index.get({
				query: {
					limit: PAGE_SIZE,
					sort: sort as FeedSort,
					before: (cursor as string | null) ?? undefined,
				},
			})

			if (error) throw error
			return data as FeedPage
		},
		{
			revalidateFirstPage: false,
			/**
			 * Landing on the feed re-reads it.
			 *
			 * `useSWRInfinite` skips any page it already has cached, and
			 * `revalidateFirstPage: false` opts page one out of that too — so without
			 * this, walking back from /upload would re-render the feed exactly as it
			 * was, missing the post just made. Mounting is the one moment worth
			 * paying for a refetch; scrolling still leaves the loaded pages alone.
			 */
			revalidateOnMount: true,
		},
	)

	const pages = query.data ?? []
	const posts = pages.flatMap(page => page.items)

	const isLoadingInitial = !query.data && query.isLoading
	const hasMore = pages.length > 0 && Boolean(pages[pages.length - 1]?.nextCursor)
	/** A page has been asked for and hasn't landed: `size` runs ahead of `data`. */
	const isLoadingMore = hasMore && query.size > pages.length

	/** Rewrite one post in the cached pages, without a round trip. */
	const patchPost = (id: string, changes: Partial<Post>) =>
		query.mutate(
			pages =>
				pages?.map(page => ({
					...page,
					items: page.items.map(item => (item.id === id ? { ...item, ...changes } : item)),
				})),
			{ revalidate: false },
		)

	/**
	 * Like or unlike, optimistically — a heart that waits for the server feels
	 * broken. The server's own tally lands on top when it answers, and a failure
	 * puts the previous one back.
	 */
	const toggleLike = async (post: Post) => {
		const liked = !post.likedByMe
		const before = { likeCount: post.likeCount, likedByMe: post.likedByMe, likers: post.likers }

		await patchPost(post.id, {
			likedByMe: liked,
			likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)),
			// Newest liker first, matching the order the API returns them in.
			likers: liked
				? me
					? [{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }, ...post.likers]
					: post.likers
				: post.likers.filter(liker => liker.id !== me?.id),
		})

		const { data, error } = liked
			? await eden.posts({ id: post.id }).like.post()
			: await eden.posts({ id: post.id }).like.delete()

		if (error || !data) {
			await patchPost(post.id, before)
			throw new Error(String(error?.value ?? 'Could not save your like'))
		}

		await patchPost(post.id, data)
	}

	/**
	 * Ask for the next page.
	 *
	 * Guarded because the scroll sentinel fires on every intersection change
	 * while a page is still in flight; without this `size` would run away and
	 * SWR would chase pages nobody has scrolled to yet.
	 */
	const loadMore = () => {
		if (hasMore && !isLoadingMore) query.setSize(size => size + 1)
	}

	return {
		...query,
		posts,
		hasMore,
		isLoadingInitial,
		isLoadingMore,
		loadMore,
		patchPost,
		toggleLike,
	}
}

/**
 * Put a just-published post at the top of the cached feed.
 *
 * The upload page isn't rendering the feed, so it reaches the cache by key
 * rather than through the hook. Without this the feed would still be right —
 * it re-reads itself on mount — but the post would only appear once that
 * request came back, which reads as "my upload didn't work".
 *
 * Only the default order gets this: "top" is the right place for a new post
 * when the feed is newest-first, and nowhere near it under any other order.
 * The rest re-read themselves on mount and land it wherever it belongs.
 *
 * The API returns a new post shaped exactly like a feed item, so if the two
 * ever drift apart this call stops type-checking.
 */
export const prependToFeed = (post: Post) =>
	globalMutate(
		unstable_serialize(feedKey(DEFAULT_FEED_SORT)),
		(pages?: FeedPage[]) => {
			// Never visited the feed this session — it'll fetch it fresh anyway.
			if (!pages?.length) return pages

			const [first, ...rest] = pages
			return [{ ...first, items: [post, ...first.items] }, ...rest]
		},
		{ revalidate: false },
	)

export const deletePost = async (id: string) => {
	const { error } = await eden.posts({ id }).delete()
	if (error) throw new Error(String(error.value ?? 'Could not delete the post'))
}

export const addComment = async (postId: string, body: string) => {
	const { data, error } = await eden.posts({ id: postId }).comments.post({ body })
	if (error || !data) throw new Error(String(error?.value ?? 'Could not post the comment'))
	return data
}

/** Like or unlike one comment; answers with that comment's fresh tally. */
export const likeComment = async (postId: string, commentId: string, liked: boolean) => {
	const endpoint = eden.posts({ id: postId }).comments({ commentId }).like

	const { data, error } = liked ? await endpoint.post() : await endpoint.delete()
	if (error || !data) throw new Error(String(error?.value ?? 'Could not save your like'))

	return data
}

export const deleteComment = async (postId: string, commentId: string) => {
	const { error } = await eden.posts({ id: postId }).comments({ commentId }).delete()
	if (error) throw new Error(String(error.value ?? 'Could not delete the comment'))
}

export default useFeed
