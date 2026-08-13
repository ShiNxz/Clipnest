'use client'

import { updateSettings } from '@/app/(app)/admin/Hooks/useAdmin'
import { useSite } from '@/app/UI/SiteProvider'
import { Button, TextInput, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DEFAULT_SITE_TITLE, SITE_DESCRIPTION_MAX_LENGTH, SITE_TITLE_MAX_LENGTH } from 'shared'

/**
 * Renames the site — the one thing on the site that isn't about clips or people.
 *
 * The current values come from the same context the header and the login screen
 * read, so this form always starts from what's actually on screen.
 */
const SiteSettingsForm = () => {
	const router = useRouter()
	const site = useSite()

	const [title, setTitle] = useState(site.title)
	const [description, setDescription] = useState(site.description)
	const [error, setError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	const trimmedTitle = title.trim()
	const trimmedDescription = description.trim()
	const isDirty = trimmedTitle !== site.title || trimmedDescription !== site.description

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (isSaving || !trimmedTitle) return

		setIsSaving(true)
		setError(null)

		try {
			await updateSettings({ title: trimmedTitle, description: trimmedDescription })

			// The name reaches the header, the login screen and the browser tab
			// through the server layout — re-render that instead of trying to patch
			// every place it appears.
			router.refresh()

			notifications.show({ message: `The site is now called ${trimmedTitle}`, color: 'teal' })
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not save the site details')
		}

		setIsSaving(false)
	}

	return (
		<form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
			<TextInput
				label="Site name"
				placeholder={DEFAULT_SITE_TITLE}
				description="Shown in the header, on the login screen, in the browser tab and as the name on shared links."
				value={title}
				onChange={event => {
					setTitle(event.currentTarget.value)
					setError(null)
				}}
				error={error}
				maxLength={SITE_TITLE_MAX_LENGTH}
				required
			/>

			<Textarea
				label="Tagline"
				placeholder="Clips and memes, between friends."
				description="Sits under the name on the login screen, and is the description search engines and chat apps show."
				value={description}
				onChange={event => setDescription(event.currentTarget.value)}
				maxLength={SITE_DESCRIPTION_MAX_LENGTH}
				autosize
				minRows={2}
			/>

			<div className="rounded-xl border border-white/5 bg-ink-900 p-4">
				<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
					How a link to the site will look
				</p>
				<p className="truncate text-sm font-medium text-indigo-300">{trimmedTitle || DEFAULT_SITE_TITLE}</p>
				<p className="mt-0.5 text-xs text-slate-400">
					{trimmedDescription || <span className="text-slate-600">No tagline</span>}
				</p>
			</div>

			<div className="flex justify-end">
				<Button type="submit" loading={isSaving} disabled={!trimmedTitle || !isDirty}>
					Save
				</Button>
			</div>
		</form>
	)
}

export default SiteSettingsForm
