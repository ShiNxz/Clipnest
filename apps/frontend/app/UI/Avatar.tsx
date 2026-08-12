'use client'

type Props = {
	src?: string | null
	name: string
	size?: number
	className?: string
}

/**
 * Plain <img> rather than next/image: avatars are small remote SVGs from
 * DiceBear and clips live on whatever R2 domain the deploy uses, so routing
 * them through the Next image optimizer would mean pinning hostnames in the
 * config for no benefit.
 */
const Avatar = ({ src, name, size = 36, className = '' }: Props) => {
	const initial = name.trim().charAt(0).toUpperCase() || '?'

	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-700 text-xs font-semibold text-slate-300 ring-1 ring-white/10 ${className}`}
			style={{ width: size, height: size }}
			title={name}
		>
			{src ? <img src={src} alt={name} width={size} height={size} className="h-full w-full object-cover" /> : initial}
		</span>
	)
}

export default Avatar
