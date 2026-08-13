'use client'

import { Tooltip } from '@mantine/core'
import { IoGlobeOutline } from 'react-icons/io5'

/**
 * Marks a post that has been shared out of the group.
 *
 * Worth its own component because it appears wherever a post does: in a feed of
 * otherwise private clips, the one that isn't private any more has to say so
 * without being clicked on.
 */
const PublicBadge = ({ className = '' }: { className?: string }) => (
	<Tooltip label="Shared — anyone with the link can see this post" withArrow openDelay={300} multiline w={220}>
		<span
			className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-300 ring-1 ring-inset ring-indigo-400/25 ${className}`}
		>
			<IoGlobeOutline size={12} />
			Public
		</span>
	</Tooltip>
)

export default PublicBadge
