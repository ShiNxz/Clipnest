'use client'

import useFeed, { type Post, deletePost } from '@/app/(app)/Hooks/useFeed'
import MediaViewer from '@/app/UI/MediaViewer'
import PostCard from '@/app/UI/PostCard'
import PostTile from '@/app/UI/PostTile'
import { PostCardSkeleton, PostTileSkeleton } from '@/app/UI/Skeletons'
import useAuth from '@/utils/useAuth'
import { Button, Loader, SegmentedControl, Select } from '@mantine/core'
import { useIntersection } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { IoCloudUploadOutline, IoGridOutline, IoListOutline, IoSwapVertical } from 'react-icons/io5'
import { DEFAULT_FEED_SORT, FEED_SORTS, FEED_SORT_LABELS, type FeedSort } from 'shared'

type View = 'feed' | 'grid'

const VIEW_STORAGE_KEY = 'clipnest:view'

const SORT_OPTIONS = FEED_SORTS.map(value => ({ value, label: FEED_SORT_LABELS[value] }))

/** How far below the last post the next page starts loading. */
const PREFETCH_MARGIN = '800px'

/** Enough placeholders to fill a tall screen in the grid; the column uses three. */
const SKELETONS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

/**
 * Two pools of colour behind the feed, faint enough to read as depth rather than
 * as decoration. `fixed`, so they stay put while the feed scrolls past them.
 *
 * The parent must carry `isolate`. These sit at `-z-10` to get behind the feed's
 * content, and without a stacking context to be trapped in they would slip all
 * the way back to the root — where the body's own opaque background covers them
 * and nothing is ever seen.
 */
const Glows = () => (
	<div aria-hidden>
		<div className="pointer-events-none fixed left-[-8%] top-[-6%] -z-10 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 opacity-[0.07] blur-[110px]" />
		<div className="pointer-events-none fixed bottom-[-10%] right-[-6%] -z-10 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-fuchsia-600 to-indigo-600 opacity-[0.06] blur-[120px]" />
	</div>
)

const FeedPage = () => {
	const { data: me } = useAuth()

	const [sort, setSort] = useState<FeedSort>(DEFAULT_FEED_SORT)
	const [view, setView] = useState<View>('feed')
	const [openIndex, setOpenIndex] = useState<number | null>(null)

	const { posts, hasMore, isLoadingInitial, isLoadingMore, error, loadMore, mutate, patchPost, toggleLike } =
		useFeed(sort)

	/**
	 * The sentinel sits a screen below the last post rather than at the very
	 * bottom, so the next page is usually already there by the time the reader
	 * gets down to it and the feed never visibly stops.
	 */
	const { ref: sentinelRef, entry } = useIntersection<HTMLDivElement>({ rootMargin: PREFETCH_MARGIN })

	// Re-runs when a page lands, so a viewport taller than one page keeps pulling
	// until the sentinel is finally pushed out of sight.
	useEffect(() => {
		if (entry?.isIntersecting) loadMore()
	}, [entry?.isIntersecting, hasMore, isLoadingMore])

	// Remembered per browser so someone who prefers the grid keeps it.
	useEffect(() => {
		const saved = window.localStorage.getItem(VIEW_STORAGE_KEY)
		if (saved === 'feed' || saved === 'grid') setView(saved)
	}, [])

	const changeView = (next: View) => {
		setView(next)
		window.localStorage.setItem(VIEW_STORAGE_KEY, next)
	}

	const changeSort = (next: string | null) => {
		if (!next) return

		setSort(next as FeedSort)
		// The viewer addresses posts by index, and the list is about to be a
		// different list.
		setOpenIndex(null)
	}

	const handleDelete = async (id: string) => {
		try {
			await deletePost(id)
			await mutate()
			notifications.show({ message: 'Post deleted', color: 'gray' })
		} catch (err) {
			notifications.show({
				title: 'Could not delete',
				message: err instanceof Error ? err.message : 'Something went wrong',
				color: 'red',
			})
		}
	}

	const handleToggleLike = async (post: Post) => {
		try {
			await toggleLike(post)
		} catch (err) {
			notifications.show({
				title: 'Could not like',
				message: err instanceof Error ? err.message : 'Something went wrong',
				color: 'red',
			})
		}
	}

	/** Arrowing towards the end of what's loaded pulls the next page in too. */
	const navigate = (index: number) => {
		setOpenIndex(index)
		if (index >= posts.length - 3) loadMore()
	}

	if (!isLoadingInitial && !posts.length) {
		return (
			<div className="relative isolate flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-20 text-center">
				<Glows />

				<span className="text-4xl">🍿</span>
				<div>
					<p className="text-lg font-semibold text-slate-200">Nothing here yet</p>
					<p className="text-sm text-slate-500">Be the first to post a clip.</p>
				</div>
				<Button component={Link} href="/upload" leftSection={<IoCloudUploadOutline />}>
					Upload something
				</Button>
			</div>
		)
	}

	return (
		<div className="relative isolate">
			<Glows />

			{/* Stays put while a new order loads — it's what the reader just clicked. */}
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-xl font-bold text-white">Feed</h1>

				<div className="flex items-center gap-2">
					<Select
						value={sort}
						onChange={changeSort}
						data={SORT_OPTIONS}
						size="xs"
						w={170}
						allowDeselect={false}
						checkIconPosition="right"
						leftSection={<IoSwapVertical size={14} />}
						aria-label="Sort the feed"
						comboboxProps={{ withinPortal: true }}
					/>

					<SegmentedControl
						value={view}
						onChange={value => changeView(value as View)}
						size="xs"
						data={[
							{ value: 'feed', label: <IoListOutline size={16} className="mx-2 inline" aria-label="Feed view" /> },
							{ value: 'grid', label: <IoGridOutline size={16} className="mx-2 inline" aria-label="Grid view" /> },
						]}
					/>
				</div>
			</div>

			{isLoadingInitial ? (
				// Shaped like whichever view is about to appear, so the wait doesn't
				// resolve into a different layout than the one it implied.
				view === 'feed' ? (
					<div className="mx-auto flex flex-col gap-6">
						{SKELETONS.slice(0, 3).map(key => (
							<PostCardSkeleton key={key} />
						))}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{SKELETONS.map(key => (
							<PostTileSkeleton key={key} />
						))}
					</div>
				)
			) : view === 'feed' ? (
				<div className="mx-auto flex flex-col gap-6">
					{posts.map((post, index) => (
						<PostCard
							key={post.id}
							post={post}
							canDelete={Boolean(me && (me.isAdmin || me.id === post.author.id))}
							onOpen={() => setOpenIndex(index)}
							onDelete={() => handleDelete(post.id)}
							onToggleLike={() => handleToggleLike(post)}
							onCommentsChange={comments => patchPost(post.id, { comments, commentCount: comments.length })}
						/>
					))}
				</div>
			) : (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{posts.map((post, index) => (
						<PostTile key={post.id} post={post} onOpen={() => setOpenIndex(index)} />
					))}
				</div>
			)}

			{hasMore && (
				<div ref={sentinelRef} className="flex justify-center py-8">
					{/* SWR retries a failed page on its own for a while; the button is for
					    when it has given up and the reader is still sitting there. */}
					{error && !isLoadingMore ? (
						<Button variant="default" onClick={() => mutate()}>
							Try again
						</Button>
					) : (
						<Loader color="indigo" size="sm" />
					)}
				</div>
			)}

			{openIndex !== null && (
				<MediaViewer
					posts={posts}
					index={openIndex}
					onClose={() => setOpenIndex(null)}
					onNavigate={navigate}
					onToggleLike={handleToggleLike}
				/>
			)}
		</div>
	)
}

export default FeedPage
