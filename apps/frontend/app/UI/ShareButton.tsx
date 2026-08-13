'use client'

import type { Post } from '@/app/(app)/Hooks/useFeed'
import { ActionIcon, Alert, Button, CopyButton, Modal, TextInput, Tooltip } from '@mantine/core'
import { useEffect, useState } from 'react'
import {
	IoCheckmark,
	IoCopyOutline,
	IoGlobeOutline,
	IoLockClosedOutline,
	IoOpenOutline,
	IoShareSocialOutline,
	IoWarningOutline,
} from 'react-icons/io5'
import { sharePath } from 'shared'

type Props = {
	post: Post
	/** Taking a post back is the author's, the sharer's or an admin's call. */
	canUnshare: boolean
	onShare: () => Promise<void>
	onUnshare: () => Promise<void>
	/** Pale and borderless, for the dark bar under the fullscreen viewer. */
	variant?: 'card' | 'viewer'
}

/**
 * The share control: a button that never shares on its own.
 *
 * Every other action in the app is undoable inside the group — a like, a
 * comment, even a delete only ever changes what the same twelve people see.
 * This one hands a post to the entire internet, so the click opens a modal that
 * says so in as many words and makes "share" a second, deliberate press.
 */
const ShareButton = ({ post, canUnshare, onShare, onUnshare, variant = 'card' }: Props) => {
	const [isOpen, setIsOpen] = useState(false)
	const [isWorking, setIsWorking] = useState(false)
	const [error, setError] = useState<string | null>(null)

	/**
	 * Read after mount rather than during render: this is a client component, but
	 * Next still renders it once on the server, where there is no `window` — and
	 * the origin someone is actually looking at is the right one to hand them,
	 * even if it isn't the one in the environment.
	 */
	const [origin, setOrigin] = useState('')
	useEffect(() => setOrigin(window.location.origin), [])

	const isShared = Boolean(post.sharedAt)
	const url = `${origin}${sharePath(post.id)}`

	const run = async (action: () => Promise<void>) => {
		setIsWorking(true)
		setError(null)

		try {
			await action()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
		}

		setIsWorking(false)
	}

	const close = () => {
		if (isWorking) return

		setIsOpen(false)
		setError(null)
	}

	return (
		<>
			<Tooltip label={isShared ? 'Shared publicly' : 'Share'} withArrow openDelay={400}>
				<ActionIcon
					variant="subtle"
					color={isShared ? 'indigo' : 'gray'}
					onClick={() => setIsOpen(true)}
					aria-label={isShared ? 'Shared publicly — manage the link' : 'Share this post'}
					size={variant === 'viewer' ? 'lg' : 'md'}
					className={variant === 'viewer' ? 'text-slate-300 hover:text-white' : undefined}
				>
					{isShared ? <IoGlobeOutline size={20} /> : <IoShareSocialOutline size={20} />}
				</ActionIcon>
			</Tooltip>

			<Modal
				opened={isOpen}
				onClose={close}
				centered
				size="md"
				title={isShared ? 'Anyone with this link can see it' : 'Share outside the group?'}
			>
				{isShared ? (
					<div className="flex flex-col gap-4">
						<p className="text-sm text-slate-400">
							This post is public. Anyone who opens the link can watch it — no account, no password — and search engines
							can list it. Nothing else on the site is reachable from it.
						</p>

						<div className="flex items-end gap-2">
							<TextInput
								label="Link"
								value={url}
								readOnly
								onFocus={event => event.currentTarget.select()}
								className="flex-1"
							/>

							<CopyButton value={url} timeout={1800}>
								{({ copied, copy }) => (
									<Button
										onClick={copy}
										color={copied ? 'teal' : undefined}
										leftSection={copied ? <IoCheckmark /> : <IoCopyOutline />}
									>
										{copied ? 'Copied' : 'Copy'}
									</Button>
								)}
							</CopyButton>
						</div>

						{error && <p className="text-sm text-rose-400">{error}</p>}

						<div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4">
							{canUnshare ? (
								<Button
									variant="subtle"
									color="red"
									leftSection={<IoLockClosedOutline />}
									loading={isWorking}
									onClick={() => run(onUnshare)}
								>
									Make it private again
								</Button>
							) : (
								// Anyone may share, but only the people with a stake in it may
								// pull it back — saying so beats a button that 403s.
								<p className="text-xs text-slate-500">Only the author or an admin can make this private again.</p>
							)}

							<Button
								component="a"
								href={url}
								target="_blank"
								rel="noreferrer"
								variant="default"
								leftSection={<IoOpenOutline />}
							>
								Open
							</Button>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-4">
						<Alert
							color="yellow"
							variant="light"
							icon={<IoWarningOutline size={20} />}
							title="This makes the post public"
						>
							Sharing creates a link that <strong>anyone</strong> can open — people without an account, people who were
							never invited, and search engines. You can undo it at any time, but not un-see it.
						</Alert>

						<div className="text-sm text-slate-400">
							<p className="mb-2">What a stranger with the link would get:</p>
							<ul className="ml-4 list-disc space-y-1 marker:text-slate-600">
								<li>This clip, its caption, and who posted it</li>
								<li>How many likes and comments it has — but not whose</li>
								<li>
									<strong className="font-semibold text-slate-300">Nothing else.</strong> The feed, every other post,
									and the whole thread stay members-only.
								</li>
							</ul>
						</div>

						{error && <p className="text-sm text-rose-400">{error}</p>}

						<div className="flex justify-end gap-2">
							<Button variant="default" onClick={close} disabled={isWorking}>
								Cancel
							</Button>
							<Button color="indigo" leftSection={<IoGlobeOutline />} loading={isWorking} onClick={() => run(onShare)}>
								Yes, make it public
							</Button>
						</div>
					</div>
				)}
			</Modal>
		</>
	)
}

export default ShareButton
