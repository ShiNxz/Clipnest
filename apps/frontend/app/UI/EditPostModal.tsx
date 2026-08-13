'use client'

import type { AdminPost } from '@/app/(app)/admin/Hooks/useAdmin'
import { updateAdminPost } from '@/app/(app)/admin/Hooks/useAdmin'
import Avatar from '@/app/UI/Avatar'
import { formatBytes, formatDuration, timeAgo } from '@/utils/format'
import { Button, Modal, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { POST_CAPTION_MAX_LENGTH } from 'shared'

type Props = {
	/** The post being edited, or null when the modal is closed. */
	post: AdminPost | null
	onClose: () => void
	onSaved: () => void
}

type FormProps = {
	post: AdminPost
	onClose: () => void
	onSaved: () => void
}

const EditPostForm = ({ post, onClose, onSaved }: FormProps) => {
	const [caption, setCaption] = useState(post.caption)
	const [error, setError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	const trimmed = caption.trim()
	const isDirty = trimmed !== post.caption

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (isSaving || !isDirty) return

		setIsSaving(true)
		setError(null)

		try {
			await updateAdminPost(post.id, { caption: trimmed })

			onSaved()
			onClose()
			notifications.show({ message: 'Caption saved', color: 'gray' })
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not save the clip')
		}

		setIsSaving(false)
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			{/* The file itself can't be swapped — it's what the post is — so it's here
			    only to make sure the right one is being edited. */}
			<div className="flex max-h-64 justify-center overflow-hidden rounded-xl bg-black">
				{post.kind === 'video' ? (
					<video src={post.url} controls preload="metadata" className="max-h-64 w-auto" />
				) : (
					<img src={post.url} alt={post.caption || 'Post'} className="max-h-64 w-auto object-contain" />
				)}
			</div>

			<p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
				<span className="inline-flex items-center gap-1.5">
					<Avatar src={post.author.avatarUrl} name={post.author.name} size={16} />
					{post.author.name}
				</span>
				<span>· {timeAgo(post.createdAt)}</span>
				<span>· {post.kind === 'video' ? (formatDuration(post.duration) ?? 'clip') : 'image'}</span>
				{post.size ? <span>· {formatBytes(post.size)}</span> : null}
			</p>

			<Textarea
				label="Caption"
				placeholder="No caption"
				description="What sits under the clip in the feed."
				value={caption}
				onChange={event => {
					setCaption(event.currentTarget.value)
					setError(null)
				}}
				error={error}
				maxLength={POST_CAPTION_MAX_LENGTH}
				autosize
				minRows={2}
				maxRows={8}
				autoFocus
			/>

			<div className="flex justify-end gap-2">
				<Button variant="default" onClick={onClose} type="button">
					Cancel
				</Button>
				<Button type="submit" loading={isSaving} disabled={!isDirty}>
					Save changes
				</Button>
			</div>
		</form>
	)
}

/**
 * Edit a clip. The caption is all there is to edit: everything else about a
 * post — its kind, size, dimensions, duration — is read off the uploaded file
 * and would only ever be a lie if it could be typed over.
 */
const EditPostModal = ({ post, onClose, onSaved }: Props) => (
	<Modal opened={Boolean(post)} onClose={onClose} title="Edit clip" centered size="md">
		{post && <EditPostForm key={post.id} post={post} onClose={onClose} onSaved={onSaved} />}
	</Modal>
)

export default EditPostModal
