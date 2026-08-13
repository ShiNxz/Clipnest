'use client'

import type { Comment, Post } from '@/app/(app)/Hooks/useFeed'
import Avatar from '@/app/UI/Avatar'
import Comments from '@/app/UI/Comments'
import LikeButton from '@/app/UI/LikeButton'
import { timeAgo } from '@/utils/format'
import { ActionIcon, Menu } from '@mantine/core'
import { BsThreeDots } from 'react-icons/bs'
import { IoExpand, IoTrashOutline } from 'react-icons/io5'

type Props = {
	post: Post
	canDelete: boolean
	onOpen: () => void
	onDelete: () => void
	onToggleLike: () => void
	onCommentsChange: (comments: Comment[]) => void
}

/** One post in the Instagram-style column: author, media, caption, thread. */
const PostCard = ({ post, canDelete, onOpen, onDelete, onToggleLike, onCommentsChange }: Props) => {
	return (
		<article className="overflow-hidden rounded-2xl border border-white/5 bg-ink-900 shadow-lg shadow-black/20">
			<header className="flex items-center gap-3 px-4 py-3">
				<Avatar src={post.author.avatarUrl} name={post.author.name} size={36} />

				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-slate-100">{post.author.name}</p>
					<p className="text-xs text-slate-500">{timeAgo(post.createdAt)}</p>
				</div>

				{canDelete && (
					<Menu position="bottom-end" withArrow>
						<Menu.Target>
							<ActionIcon variant="subtle" color="gray" aria-label="Post options">
								<BsThreeDots />
							</ActionIcon>
						</Menu.Target>
						<Menu.Dropdown>
							<Menu.Item color="red" leftSection={<IoTrashOutline />} onClick={onDelete}>
								Delete
							</Menu.Item>
						</Menu.Dropdown>
					</Menu>
				)}
			</header>

			<div className="group relative bg-black">
				{post.kind === 'video' ? (
					// Native controls in the feed so a clip can be watched without
					// leaving the scroll position; the expand button is the way into
					// the fullscreen viewer.
					<video
						src={post.url}
						controls
						playsInline
						preload="metadata"
						className="max-h-[75vh] w-full bg-black object-contain"
					/>
				) : (
					<img
						src={post.url}
						alt={post.caption || 'Post'}
						onClick={onOpen}
						className="max-h-[75vh] w-full cursor-zoom-in object-contain"
					/>
				)}

				<button
					type="button"
					onClick={onOpen}
					aria-label="Open fullscreen"
					className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
				>
					<IoExpand size={18} />
				</button>
			</div>

			<footer className="space-y-3 px-4 py-3">
				<div className="flex items-start justify-between gap-3">
					<p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-slate-200">{post.caption}</p>

					<LikeButton
						likeCount={post.likeCount}
						likedByMe={post.likedByMe}
						likers={post.likers}
						onToggle={onToggleLike}
					/>
				</div>

				<div className="border-t border-white/5 pt-3">
					<Comments
						postId={post.id}
						postAuthorId={post.author.id}
						comments={post.comments}
						onChange={onCommentsChange}
					/>
				</div>
			</footer>
		</article>
	)
}

export default PostCard
