'use client'

import type { Post } from '@/app/(app)/Hooks/useFeed'
import Avatar from '@/app/UI/Avatar'
import { timeAgo } from '@/utils/format'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { IoChevronBack, IoChevronForward, IoClose } from 'react-icons/io5'

// react-player touches `window` on import, so it can't be part of the server bundle.
const ReactPlayer = dynamic(() => import('react-player/file'), { ssr: false })

type Props = {
	posts: Post[]
	index: number
	onClose: () => void
	onNavigate: (index: number) => void
}

/**
 * Fullscreen viewer for one post, with the rest of the feed reachable by arrow
 * key so it behaves like a lightbox rather than a dead end.
 */
const MediaViewer = ({ posts, index, onClose, onNavigate }: Props) => {
	const post = posts[index]

	const hasPrevious = index > 0
	const hasNext = index < posts.length - 1

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose()
			if (event.key === 'ArrowLeft' && hasPrevious) onNavigate(index - 1)
			if (event.key === 'ArrowRight' && hasNext) onNavigate(index + 1)
		}

		window.addEventListener('keydown', onKey)

		// The page behind must not scroll while the viewer is open.
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'

		return () => {
			window.removeEventListener('keydown', onKey)
			document.body.style.overflow = previousOverflow
		}
	}, [index, hasPrevious, hasNext, onClose, onNavigate])

	if (!post) return null

	return (
		<div className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-black/90 backdrop-blur-md">
			{/* Header */}
			<div className="flex items-center gap-3 px-4 py-3 sm:px-6">
				<Avatar src={post.author.avatarUrl} name={post.author.name} size={34} />
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-white">{post.author.name}</p>
					<p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
				</div>

				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="ml-auto rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
				>
					<IoClose size={26} />
				</button>
			</div>

			{/* Media */}
			<div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
				{hasPrevious && (
					<button
						type="button"
						onClick={() => onNavigate(index - 1)}
						aria-label="Previous"
						className="absolute left-1 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/80 sm:left-4"
					>
						<IoChevronBack size={26} />
					</button>
				)}

				{post.kind === 'video' ? (
					<div className="h-full w-full max-w-5xl animate-pop-in">
						<ReactPlayer
							url={post.url}
							controls
							playing
							width="100%"
							height="100%"
							style={{ maxHeight: '100%' }}
							config={{ attributes: { controlsList: 'nodownload', playsInline: true } }}
						/>
					</div>
				) : (
					<img
						src={post.url}
						alt={post.caption || 'Post'}
						className="max-h-full max-w-full animate-pop-in rounded-lg object-contain"
					/>
				)}

				{hasNext && (
					<button
						type="button"
						onClick={() => onNavigate(index + 1)}
						aria-label="Next"
						className="absolute right-1 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/80 sm:right-4"
					>
						<IoChevronForward size={26} />
					</button>
				)}
			</div>

			{/* Caption */}
			{post.caption && (
				<div className="shrink-0 px-4 py-4 sm:px-6">
					<p className="mx-auto max-w-3xl whitespace-pre-wrap text-center text-sm text-slate-200">{post.caption}</p>
				</div>
			)}
		</div>
	)
}

export default MediaViewer
