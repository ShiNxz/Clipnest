'use client'

import { useState } from 'react'
import { type FileRejection, useDropzone } from 'react-dropzone'
import { IoCloudUploadOutline } from 'react-icons/io5'

type Props = {
	onFiles: (files: File[]) => void
	disabled?: boolean
}

/**
 * Deliberately unbounded: no `maxSize`, no `maxFiles`. Big clips are the point,
 * and nothing streams through the API anyway — the browser PUTs straight to R2.
 */
const Dropzone = ({ onFiles, disabled }: Props) => {
	const [error, setError] = useState<string | null>(null)

	const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
		accept: { 'image/*': [], 'video/*': [] },
		disabled,
		onDrop(accepted: File[], rejections: FileRejection[]) {
			if (!accepted.length) {
				return setError(rejections[0]?.errors[0]?.message || 'Those files are not images or videos')
			}

			setError(null)
			onFiles(accepted)
		},
	})

	return (
		<div
			{...getRootProps()}
			className={`flex h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
				isDragReject || error
					? 'border-red-500/60 bg-red-500/10 text-red-300'
					: isDragAccept
						? 'border-indigo-400 bg-indigo-500/10 text-indigo-200'
						: 'border-white/15 bg-white/[0.02] text-slate-400 hover:border-white/25 hover:bg-white/[0.04]'
			} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
		>
			<input {...getInputProps()} />

			<IoCloudUploadOutline size={34} className="mb-2" />
			<p className="text-base font-medium text-slate-200">{error ?? 'Drop clips or memes here'}</p>
			<p className="text-sm">Videos and images · any size, any length</p>
		</div>
	)
}

export default Dropzone
