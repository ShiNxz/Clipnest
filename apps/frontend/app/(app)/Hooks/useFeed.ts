import eden from '@/utils/eden'
import useSWRInfinite from 'swr/infinite'

type FeedPage = NonNullable<Awaited<ReturnType<typeof eden.posts.index.get>>['data']>

export type Post = FeedPage['items'][number]

const PAGE_SIZE = 12

/**
 * The feed, paged.
 *
 * Keyset cursors mean each page asks for "older than the last thing I have",
 * so posting while someone scrolls never duplicates or skips an item.
 */
const useFeed = () => {
	const query = useSWRInfinite<FeedPage>(
		(index, previous) => {
			// A null cursor on a loaded page means there's nothing older left.
			if (previous && !previous.nextCursor) return null
			return ['feed', index === 0 ? null : previous?.nextCursor] as const
		},
		async ([, cursor]) => {
			const { data, error } = await eden.posts.index.get({
				query: { limit: PAGE_SIZE, before: (cursor as string | null) ?? undefined },
			})

			if (error) throw error
			return data as FeedPage
		},
		{ revalidateFirstPage: false, keepPreviousData: true },
	)

	const pages = query.data ?? []
	const posts = pages.flatMap(page => page.items)

	const isLoadingInitial = !query.data && query.isLoading
	const isLoadingMore = query.isValidating && pages.length > 0 && query.size > pages.length
	const hasMore = pages.length > 0 && Boolean(pages[pages.length - 1]?.nextCursor)

	return {
		...query,
		posts,
		hasMore,
		isLoadingInitial,
		isLoadingMore,
		loadMore: () => query.setSize(size => size + 1),
	}
}

export const deletePost = async (id: string) => {
	const { error } = await eden.posts({ id }).delete()
	if (error) throw new Error(String(error.value ?? 'Could not delete the post'))
}

export default useFeed
