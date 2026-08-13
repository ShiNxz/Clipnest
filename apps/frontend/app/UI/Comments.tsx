'use client'

import { type Comment, addComment, deleteComment, likeComment } from '@/app/(app)/Hooks/useFeed'
import Avatar from '@/app/UI/Avatar'
import LikeButton from '@/app/UI/LikeButton'
import { timeAgo } from '@/utils/format'
import useAuth from '@/utils/useAuth'
import { ActionIcon, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { IoSend, IoTrashOutline } from 'react-icons/io5'
import { byTopComments } from 'shared'

const MAX_LENGTH = 1000

type Props = {
	postId: string
	/** The post's own author — they can moderate the thread under it. */
	postAuthorId: string
	comments: Comment[]
	/** Hands the whole thread back so the feed's copy stays the one truth. */
	onChange: (comments: Comment[]) => void
}

/**
 * A post's thread: everything said, plus the box to say something.
 *
 * The comments come in as a prop rather than being fetched here — they travel
 * with the feed — so this owns nothing but the draft.
 */
const Comments = ({ postId, postAuthorId, comments, onChange }: Props) => {
	const { data: me } = useAuth()

	const [draft, setDraft] = useState('')
	const [isSending, setIsSending] = useState(false)

	// The API sends them in this order already; sorting again here is what makes
	// a like re-rank the thread on the spot, without waiting for a refetch.
	const ordered = [...comments].sort(byTopComments)

	// Your own words, anything under your own post, or you run the place.
	const canDelete = (comment: Comment) =>
		Boolean(me && (me.isAdmin || me.id === comment.authorId || me.id === postAuthorId))

	const submit = async () => {
		const body = draft.trim()
		if (!body || isSending) return

		setIsSending(true)

		try {
			const created = await addComment(postId, body)
			setDraft('')
			onChange([...comments, created])
		} catch (err) {
			notifications.show({
				title: 'Could not comment',
				message: err instanceof Error ? err.message : 'Something went wrong',
				color: 'red',
			})
		} finally {
			setIsSending(false)
		}
	}

	const remove = async (id: string) => {
		try {
			await deleteComment(postId, id)
			onChange(comments.filter(comment => comment.id !== id))
		} catch (err) {
			notifications.show({
				title: 'Could not delete',
				message: err instanceof Error ? err.message : 'Something went wrong',
				color: 'red',
			})
		}
	}

	/** Optimistic, like the post's own heart — and put back if the server says no. */
	const toggleLike = async (comment: Comment) => {
		const liked = !comment.likedByMe
		const replace = (next: Comment) => onChange(comments.map(item => (item.id === comment.id ? next : item)))

		replace({
			...comment,
			likedByMe: liked,
			likeCount: Math.max(0, comment.likeCount + (liked ? 1 : -1)),
			likers: liked
				? me
					? [{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }, ...comment.likers]
					: comment.likers
				: comment.likers.filter(liker => liker.id !== me?.id),
		})

		try {
			replace({ ...comment, ...(await likeComment(postId, comment.id, liked)) })
		} catch (err) {
			replace(comment)
			notifications.show({
				title: 'Could not like',
				message: err instanceof Error ? err.message : 'Something went wrong',
				color: 'red',
			})
		}
	}

	return (
		<div className="space-y-3">
			{ordered.length > 0 && (
				<div className="flex flex-col gap-2.5">
					{ordered.map(comment => (
						<div key={comment.id} className="group/comment flex items-start gap-2">
							<Avatar src={comment.author.avatarUrl} name={comment.author.name} size={26} />

							<div className="min-w-0 flex-1">
								{/* Name and time own their line — running them into the body reads
								    as one sentence, and doubly so when the body is RTL. */}
								<div className="flex items-center gap-2">
									<span className="truncate text-sm font-semibold text-slate-100">{comment.author.name}</span>
									<span className="shrink-0 text-[11px] text-slate-500">{timeAgo(comment.createdAt)}</span>

									{/* The heart is last, and the tally sits left of it, so it lands in
									    the same place on every row however much else the row carries. */}
									<div className="ml-auto flex shrink-0 items-center gap-0.5">
										{canDelete(comment) && (
											<ActionIcon
												variant="subtle"
												color="gray"
												size="sm"
												aria-label="Delete comment"
												className="opacity-0 transition focus:opacity-100 group-hover/comment:opacity-100"
												onClick={() => remove(comment.id)}
											>
												<IoTrashOutline size={14} />
											</ActionIcon>
										)}

										<LikeButton
											compact
											size={14}
											likeCount={comment.likeCount}
											likedByMe={comment.likedByMe}
											likers={comment.likers}
											onToggle={() => toggleLike(comment)}
										/>
									</div>
								</div>

								<p className="whitespace-pre-wrap break-words text-sm leading-snug text-slate-200">{comment.body}</p>
							</div>
						</div>
					))}
				</div>
			)}

			<form
				onSubmit={event => {
					event.preventDefault()
					submit()
				}}
				className="flex items-center gap-2"
			>
				<TextInput
					size="xs"
					className="flex-1"
					placeholder="Add a comment…"
					maxLength={MAX_LENGTH}
					value={draft}
					onChange={event => setDraft(event.currentTarget.value)}
				/>

				<ActionIcon
					type="submit"
					variant="subtle"
					color="indigo"
					aria-label="Post comment"
					loading={isSending}
					disabled={!draft.trim()}
				>
					<IoSend size={15} />
				</ActionIcon>
			</form>
		</div>
	)
}

export default Comments
