'use client'

import { prependToFeed } from '@/app/(app)/Hooks/useFeed'
import Dropzone from '@/app/UI/Dropzone'
import { formatBytes } from '@/utils/format'
import { isVideo, mimeOf } from '@/utils/media'
import { uploadAndPost } from '@/utils/upload'
import { ActionIcon, Button, Progress, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IoCheckmarkCircle, IoClose, IoWarning } from 'react-icons/io5'

type Status = 'queued' | 'uploading' | 'done' | 'error'

type QueuedFile = {
	id: string
	file: File
	previewUrl: string
	caption: string
	progress: number
	status: Status
	error?: string
}

const UploadPage = () => {
	const router = useRouter()

	const [items, setItems] = useState<QueuedFile[]>([])
	const [isUploading, setIsUploading] = useState(false)

	// Object URLs have to be revoked by hand; a ref keeps the cleanup effect from
	// re-running (and revoking live previews) every time the list changes.
	const itemsRef = useRef<QueuedFile[]>([])
	itemsRef.current = items

	useEffect(() => {
		return () => {
			for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl)
		}
	}, [])

	const addFiles = useCallback((files: File[]) => {
		setItems(previous => [
			...previous,
			...files.map(file => ({
				id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
				file,
				previewUrl: URL.createObjectURL(file),
				caption: '',
				progress: 0,
				status: 'queued' as Status,
			})),
		])
	}, [])

	const patch = (id: string, changes: Partial<QueuedFile>) =>
		setItems(previous => previous.map(item => (item.id === id ? { ...item, ...changes } : item)))

	const remove = (id: string) =>
		setItems(previous => {
			const target = previous.find(item => item.id === id)
			if (target) URL.revokeObjectURL(target.previewUrl)
			return previous.filter(item => item.id !== id)
		})

	const handlePost = async () => {
		const pending = items.filter(item => item.status === 'queued' || item.status === 'error')
		if (!pending.length) return

		setIsUploading(true)

		// Collected here rather than read back off state: the `patch` calls below
		// are queued React updates and won't have landed by the time the loop ends.
		const failures: string[] = []

		// One at a time: parallel multi-GB uploads just fight over the same
		// upstream bandwidth and make every progress bar crawl.
		for (const item of pending) {
			patch(item.id, { status: 'uploading', progress: 0, error: undefined })

			try {
				const created = await uploadAndPost(item.file, item.caption, ratio => patch(item.id, { progress: ratio }))
				patch(item.id, { status: 'done', progress: 1 })

				// Straight into the feed's cache, so it's already there when the
				// redirect below lands.
				if (created) await prependToFeed(created)
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Upload failed'
				failures.push(message)
				patch(item.id, { status: 'error', error: message })
			}
		}

		setIsUploading(false)

		if (failures.length) {
			notifications.show({
				title: `${failures.length} upload${failures.length > 1 ? 's' : ''} failed`,
				message: failures[0],
				color: 'red',
			})
			return
		}

		notifications.show({ message: 'Posted!', color: 'teal' })
		router.push('/')
	}

	const pendingCount = items.filter(item => item.status === 'queued' || item.status === 'error').length

	return (
		<div className="mx-auto">
			<h1 className="mb-5 text-xl font-bold text-white">Upload</h1>

			<Dropzone onFiles={addFiles} disabled={isUploading} />

			{items.length > 0 && (
				<div className="mt-6 flex flex-col gap-3">
					{items.map(item => {
						const video = isVideo(mimeOf(item.file))

						return (
							<div key={item.id} className="flex gap-3 rounded-xl border border-white/5 bg-ink-900 p-3">
								<div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black">
									{video ? (
										<video src={item.previewUrl} muted playsInline className="h-full w-full object-cover" />
									) : (
										<img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
									)}
								</div>

								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="truncate text-sm font-medium text-slate-200">{item.file.name}</p>
										<span className="shrink-0 text-xs text-slate-500">{formatBytes(item.file.size)}</span>

										{item.status === 'done' && <IoCheckmarkCircle className="ml-auto shrink-0 text-teal-400" />}
										{item.status === 'error' && <IoWarning className="ml-auto shrink-0 text-red-400" />}

										{item.status !== 'uploading' && item.status !== 'done' && (
											<ActionIcon
												variant="subtle"
												color="gray"
												size="sm"
												className="ml-auto"
												aria-label="Remove"
												onClick={() => remove(item.id)}
											>
												<IoClose />
											</ActionIcon>
										)}
									</div>

									<TextInput
										size="xs"
										mt={6}
										placeholder="Say something about it…"
										value={item.caption}
										disabled={item.status === 'uploading' || item.status === 'done'}
										onChange={event => patch(item.id, { caption: event.currentTarget.value })}
									/>

									{item.status === 'uploading' && (
										<Progress value={item.progress * 100} size="sm" mt={8} animated color="indigo" />
									)}

									{item.error && <p className="mt-1.5 text-xs text-red-400">{item.error}</p>}
								</div>
							</div>
						)
					})}
				</div>
			)}

			{items.length > 0 && (
				<div className="mt-6 flex justify-end gap-2">
					<Button variant="default" onClick={() => setItems([])} disabled={isUploading}>
						Clear
					</Button>
					<Button onClick={handlePost} loading={isUploading} disabled={!pendingCount}>
						{pendingCount > 1 ? `Post ${pendingCount} files` : 'Post'}
					</Button>
				</div>
			)}
		</div>
	)
}

export default UploadPage
