'use client'

import { Skeleton } from '@mantine/core'

/**
 * Placeholders shaped like the thing that's coming.
 *
 * A centred spinner says "wait"; these say what you're waiting for, and because
 * they take up roughly the same box as the real thing the page doesn't jump when
 * the data lands. Mantine's own Skeleton does the shimmer, so this adds no CSS.
 */

/**
 * One card in the feed column: author line, media, caption.
 *
 * Held at partial opacity because Mantine's dark-mode skeleton fill is a fairly
 * light grey — at full strength the media block reads as a solid panel that's
 * brighter than any real post, which is the opposite of "still loading".
 */
export const PostCardSkeleton = () => (
	<div className="overflow-hidden rounded-2xl border border-white/5 bg-ink-900 opacity-50">
		<div className="flex items-center gap-3 px-4 py-3">
			<Skeleton circle height={36} />

			<div className="flex-1">
				<Skeleton height={10} width={120} radius="xl" />
				<Skeleton height={8} width={64} radius="xl" mt={8} />
			</div>
		</div>

		{/* Roughly the shape of a clip filmed on a phone, which is most of what
		    gets posted — so the reflow when the real media arrives is small. */}
		<Skeleton radius={0} className="aspect-[4/3] w-full" />

		<div className="px-4 py-3">
			<Skeleton height={10} width="60%" radius="xl" />
			<Skeleton height={10} width="30%" radius="xl" mt={10} />
		</div>
	</div>
)

/** One cell of the grid. `12` is the pixel value of the tile's `rounded-xl`. */
export const PostTileSkeleton = () => <Skeleton radius={12} className="aspect-square w-full opacity-50" />
