'use client'

import type { Post } from '@/app/(app)/Hooks/useFeed'
import Avatar from '@/app/UI/Avatar'
import { formatDuration } from '@/utils/format'
import { IoChatbubble, IoHeart, IoPlay } from 'react-icons/io5'

type Props = {
	post: Post
	onOpen: () => void
}

/** One square cell of the grid view. Everything opens the fullscreen viewer. */
const PostTile = ({ post, onOpen }: Props) => {
	const duration = formatDuration(post.duration)

	return (
		<button
			type="button"
			onClick={onOpen}
			className="group relative aspect-square w-full overflow-hidden rounded-xl bg-ink-900 ring-1 ring-white/5 transition hover:ring-white/20"
		>
			{post.kind === 'video' ? (
				// `#t=0.1` makes the browser seek to the first frame and render it as a
				// still — a free poster image without generating thumbnails server-side.
				<video
					src={`${post.url}#t=0.1`}
					preload="metadata"
					muted
					playsInline
					className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
				/>
			) : (
				<img
					src={post.url}
					alt={post.caption || 'Post'}
					className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
				/>
			)}

			{post.kind === 'video' && (
				<span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
					<IoPlay size={11} />
					{duration ?? 'Clip'}
				</span>
			)}

			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8 opacity-0 transition group-hover:opacity-100">
				<Avatar src={post.author.avatarUrl} name={post.author.name} size={22} />
				<span className="truncate text-left text-xs font-medium text-white">{post.caption || post.author.name}</span>

				{(post.likeCount > 0 || post.commentCount > 0) && (
					<span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] font-medium text-white">
						{post.likeCount > 0 && (
							<span className="flex items-center gap-1">
								<IoHeart size={12} className={post.likedByMe ? 'text-rose-500' : undefined} />
								{post.likeCount}
							</span>
						)}
						{post.commentCount > 0 && (
							<span className="flex items-center gap-1">
								<IoChatbubble size={11} />
								{post.commentCount}
							</span>
						)}
					</span>
				)}
			</div>
		</button>
	)
}

export default PostTile
