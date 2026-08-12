'use client'

import useFeed, { deletePost } from '@/app/(app)/Hooks/useFeed'
import MediaViewer from '@/app/UI/MediaViewer'
import PostCard from '@/app/UI/PostCard'
import PostTile from '@/app/UI/PostTile'
import useAuth from '@/utils/useAuth'
import { Button, Loader, SegmentedControl } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { IoCloudUploadOutline, IoGridOutline, IoListOutline } from 'react-icons/io5'

type View = 'feed' | 'grid'

const VIEW_STORAGE_KEY = 'clipnest:view'

const FeedPage = () => {
	const { data: me } = useAuth()
	const { posts, hasMore, isLoadingInitial, isLoadingMore, loadMore, mutate } = useFeed()

	const [view, setView] = useState<View>('feed')
	const [openIndex, setOpenIndex] = useState<number | null>(null)

	// Remembered per browser so someone who prefers the grid keeps it.
	useEffect(() => {
		const saved = window.localStorage.getItem(VIEW_STORAGE_KEY)
		if (saved === 'feed' || saved === 'grid') setView(saved)
	}, [])

	const changeView = (next: View) => {
		setView(next)
		window.localStorage.setItem(VIEW_STORAGE_KEY, next)
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

	if (isLoadingInitial) {
		return (
			<div className="flex justify-center py-20">
				<Loader color="indigo" />
			</div>
		)
	}

	if (!posts.length) {
		return (
			<div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-20 text-center">
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
		<>
			<div className="mb-5 flex items-center justify-between">
				<h1 className="text-xl font-bold text-white">Feed</h1>

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

			{view === 'feed' ? (
				<div className="mx-auto flex max-w-xl flex-col gap-6">
					{posts.map((post, index) => (
						<PostCard
							key={post.id}
							post={post}
							canDelete={Boolean(me && (me.isAdmin || me.id === post.author.id))}
							onOpen={() => setOpenIndex(index)}
							onDelete={() => handleDelete(post.id)}
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
				<div className="flex justify-center py-8">
					<Button variant="default" onClick={loadMore} loading={isLoadingMore}>
						Load more
					</Button>
				</div>
			)}

			{openIndex !== null && (
				<MediaViewer posts={posts} index={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
			)}
		</>
	)
}

export default FeedPage
