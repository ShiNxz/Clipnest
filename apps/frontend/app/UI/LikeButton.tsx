'use client'

import type { Liker } from '@/app/(app)/Hooks/useFeed'
import Avatar from '@/app/UI/Avatar'
import { HoverCard } from '@mantine/core'
import { IoHeart, IoHeartOutline } from 'react-icons/io5'

type Props = {
	likeCount: number
	likedByMe: boolean
	/** Newest first, and capped by the API — `likeCount` is the real total. */
	likers: Liker[]
	onToggle: () => void
	size?: number
	/**
	 * Bare number instead of "3 likes", and the tally moves to the left of the
	 * heart — for the tight rows under a comment, where the heart is the last
	 * thing in the row and every row wants it in the same place.
	 */
	compact?: boolean
}

/** The heart, the tally, and the faces behind it on hover. */
const LikeButton = ({ likeCount, likedByMe, likers, onToggle, size = 22, compact }: Props) => {
	// Only ever positive when the likers list was truncated.
	const hidden = likeCount - likers.length

	const heart = (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={likedByMe}
			aria-label={likedByMe ? 'Unlike' : 'Like'}
			className={`rounded-full p-1 transition hover:scale-110 active:scale-95 ${
				likedByMe ? 'text-rose-500' : 'text-slate-300 hover:text-white'
			}`}
		>
			{likedByMe ? <IoHeart size={size} /> : <IoHeartOutline size={size} />}
		</button>
	)

	const tally = likeCount > 0 && (
		<HoverCard width={240} shadow="md" openDelay={120} closeDelay={80} position="bottom-start" withArrow>
			<HoverCard.Target>
				{/* Not a button: the count is the hover handle, the heart does the liking. */}
				<span className={`cursor-default select-none font-medium text-slate-300 ${compact ? 'text-xs' : 'text-sm'}`}>
					{compact ? likeCount : `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
				</span>
			</HoverCard.Target>

			<HoverCard.Dropdown>
				<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Liked by</p>

				<div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
					{likers.map(liker => (
						<div key={liker.id} className="flex items-center gap-2">
							<Avatar src={liker.avatarUrl} name={liker.name} size={24} />
							<span className="truncate text-sm text-slate-200">{liker.name}</span>
						</div>
					))}
				</div>

				{hidden > 0 && <p className="mt-2 text-xs text-slate-500">and {hidden} more</p>}
			</HoverCard.Dropdown>
		</HoverCard>
	)

	return (
		<div className="flex items-center gap-1.5">
			{compact ? (
				<>
					{tally}
					{heart}
				</>
			) : (
				<>
					{heart}
					{tally}
				</>
			)}
		</div>
	)
}

export default LikeButton
