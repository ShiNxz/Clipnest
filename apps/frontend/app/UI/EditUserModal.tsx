'use client'

import type { AdminUser } from '@/app/(app)/admin/Hooks/useAdmin'
import { updateUser } from '@/app/(app)/admin/Hooks/useAdmin'
import AvatarPicker from '@/app/UI/AvatarPicker'
import { Button, Modal, Switch, TextInput, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { IoCopyOutline, IoDice } from 'react-icons/io5'
import { randomPassword } from 'shared'

type Props = {
	/** The user being edited, or null when the modal is closed. */
	user: AdminUser | null
	/** Whether that user is the admin doing the editing. */
	isSelf: boolean
	onClose: () => void
	onSaved: () => void
}

type FormProps = {
	user: AdminUser
	isSelf: boolean
	onClose: () => void
	onSaved: () => void
}

const EditUserForm = ({ user, isSelf, onClose, onSaved }: FormProps) => {
	const [name, setName] = useState(user.name)
	const [avatar, setAvatar] = useState(user.avatarUrl)
	const [isAdmin, setIsAdmin] = useState(user.isAdmin)
	// Blank means "leave it alone" — the current one is a hash and can't be shown.
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	const trimmedName = name.trim()

	const patch = {
		...(trimmedName !== user.name && { name: trimmedName }),
		...(avatar !== user.avatarUrl && { avatarUrl: avatar }),
		...(isAdmin !== user.isAdmin && { isAdmin }),
		...(password && { password }),
	}

	const isDirty = Object.keys(patch).length > 0
	const canSave = Boolean(trimmedName) && (!password || password.length >= 4) && isDirty

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (isSaving || !canSave) return

		setIsSaving(true)
		setError(null)

		try {
			await updateUser(user.id, patch)

			// Same rule as creating a user: a password is visible once, here, or never.
			if (password) {
				notifications.show({
					title: `New password for ${trimmedName}`,
					message: password,
					color: 'teal',
					autoClose: 15000,
				})
			} else {
				notifications.show({ message: `${trimmedName} updated`, color: 'gray' })
			}

			onSaved()
			onClose()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not save the user')
		}

		setIsSaving(false)
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<TextInput
				label="Name"
				description="This is what they pick from the dropdown on the login page."
				value={name}
				onChange={event => {
					setName(event.currentTarget.value)
					setError(null)
				}}
				error={error}
				maxLength={60}
				required
				autoFocus
			/>

			<TextInput
				label="New password"
				description="Leave this empty to keep their current one."
				placeholder="Unchanged"
				value={password}
				onChange={event => setPassword(event.currentTarget.value)}
				error={password && password.length < 4 ? 'At least 4 characters' : null}
				rightSectionWidth={70}
				rightSection={
					<div className="flex gap-1 pr-1">
						<button
							type="button"
							aria-label="Copy password"
							onClick={() => password && navigator.clipboard?.writeText(password)}
							className="rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
						>
							<IoCopyOutline size={15} />
						</button>
						<button
							type="button"
							aria-label="Generate a new password"
							onClick={() => setPassword(randomPassword())}
							className="rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
						>
							<IoDice size={15} />
						</button>
					</div>
				}
			/>

			<AvatarPicker value={avatar} onChange={setAvatar} />

			<Tooltip label="You can't remove your own admin access" disabled={!isSelf} position="top-start">
				<div className="w-fit">
					<Switch
						label="This user is an admin"
						checked={isAdmin}
						disabled={isSelf}
						onChange={event => setIsAdmin(event.currentTarget.checked)}
					/>
				</div>
			</Tooltip>

			<div className="flex justify-end gap-2 pt-2">
				<Button variant="default" onClick={onClose} type="button">
					Cancel
				</Button>
				<Button type="submit" loading={isSaving} disabled={!canSave}>
					Save changes
				</Button>
			</div>
		</form>
	)
}

/**
 * Edit an existing user: their name, their face, their admin flag, and — since
 * a hash can't be read back — optionally a brand new password.
 *
 * The form is a child keyed by user id so every field initialises from the row
 * being edited, rather than being synced into place by an effect after mount.
 */
const EditUserModal = ({ user, isSelf, onClose, onSaved }: Props) => (
	<Modal opened={Boolean(user)} onClose={onClose} title={user ? `Edit ${user.name}` : 'Edit user'} centered size="md">
		{user && <EditUserForm key={user.id} user={user} isSelf={isSelf} onClose={onClose} onSaved={onSaved} />}
	</Modal>
)

export default EditUserModal
