'use client'

import { Select } from '@mantine/core'
import { useMemo, useState } from 'react'
import { IoDice } from 'react-icons/io5'
import { AVATAR_STYLES, type AvatarStyle, DEFAULT_AVATAR_STYLE, avatarUrl, randomSeed } from 'shared'

type Props = {
	value: string
	onChange: (url: string) => void
}

const BATCH = 6

const freshBatch = (style: AvatarStyle) => Array.from({ length: BATCH }, () => avatarUrl(randomSeed(), style))

/**
 * Pick a face for a new user.
 *
 * DiceBear avatars are pure functions of (style, seed), so re-rolling is just
 * new random seeds — no upload, no storage, and the picked URL is the whole
 * thing that gets saved on the user.
 */
const AvatarPicker = ({ value, onChange }: Props) => {
	const [style, setStyle] = useState<AvatarStyle>(DEFAULT_AVATAR_STYLE)
	const [seeds, setSeeds] = useState<string[]>(() => freshBatch(DEFAULT_AVATAR_STYLE))

	const options = useMemo(() => AVATAR_STYLES.map(name => ({ value: name, label: name.replace(/-/g, ' ') })), [])

	const reroll = (nextStyle: AvatarStyle = style) => {
		const batch = freshBatch(nextStyle)
		setSeeds(batch)
		onChange(batch[0])
	}

	const changeStyle = (next: AvatarStyle) => {
		setStyle(next)
		reroll(next)
	}

	return (
		<div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
			<div className="mb-3 flex items-end gap-2">
				<Select
					label="Avatar style"
					size="xs"
					className="flex-1"
					data={options}
					value={style}
					onChange={next => next && changeStyle(next as AvatarStyle)}
					allowDeselect={false}
					comboboxProps={{ withinPortal: true }}
				/>

				<button
					type="button"
					onClick={() => reroll()}
					className="flex h-[30px] items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/10"
				>
					<IoDice size={14} />
					Randomize
				</button>
			</div>

			<div className="flex flex-wrap gap-2">
				{seeds.map(url => (
					<button
						key={url}
						type="button"
						onClick={() => onChange(url)}
						aria-label="Use this avatar"
						className={`h-12 w-12 overflow-hidden rounded-full bg-ink-800 ring-2 transition ${
							value === url ? 'ring-indigo-400' : 'ring-transparent hover:ring-white/20'
						}`}
					>
						<img src={url} alt="" className="h-full w-full" />
					</button>
				))}
			</div>
		</div>
	)
}

export default AvatarPicker
