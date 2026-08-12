'use client'

import { createUser } from '@/app/(app)/admin/Hooks/useAdmin'
import AvatarPicker from '@/app/UI/AvatarPicker'
import { Button, Modal, Switch, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'
import { IoCopyOutline, IoDice } from 'react-icons/io5'
import { DEFAULT_AVATAR_STYLE, avatarUrl, randomPassword, randomSeed } from 'shared'

type Props = {
	opened: boolean
	onClose: () => void
	onCreated: () => void
}

const NewUserModal = ({ opened, onClose, onCreated }: Props) => {
	const [name, setName] = useState('')
	const [password, setPassword] = useState('')
	const [avatar, setAvatar] = useState('')
	const [isAdmin, setIsAdmin] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	// Fresh password and face every time the modal opens.
	useEffect(() => {
		if (!opened) return

		setName('')
		setPassword(randomPassword())
		setAvatar(avatarUrl(randomSeed(), DEFAULT_AVATAR_STYLE))
		setIsAdmin(false)
		setError(null)
	}, [opened])

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (isSaving) return

		setIsSaving(true)
		setError(null)

		try {
			await createUser({ name: name.trim(), password, avatarUrl: avatar, isAdmin })

			// The password is never retrievable again — show it once, clearly.
			notifications.show({
				title: `${name.trim()} can log in now`,
				message: `Password: ${password}`,
				color: 'teal',
				autoClose: 15000,
			})

			onCreated()
			onClose()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not create the user')
		}

		setIsSaving(false)
	}

	return (
		<Modal opened={opened} onClose={onClose} title="New user" centered size="md">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<TextInput
					label="Name"
					placeholder="Nissim"
					description="This is what they pick from the dropdown on the login page."
					value={name}
					onChange={event => {
						setName(event.currentTarget.value)
						setError(null)
					}}
					error={error}
					required
					autoFocus
				/>

				<TextInput
					label="Password"
					value={password}
					onChange={event => setPassword(event.currentTarget.value)}
					required
					rightSectionWidth={70}
					rightSection={
						<div className="flex gap-1 pr-1">
							<button
								type="button"
								aria-label="Copy password"
								onClick={() => navigator.clipboard?.writeText(password)}
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

				<Switch
					label="Make this user an admin"
					checked={isAdmin}
					onChange={event => setIsAdmin(event.currentTarget.checked)}
				/>

				<div className="flex justify-end gap-2 pt-2">
					<Button variant="default" onClick={onClose} type="button">
						Cancel
					</Button>
					<Button type="submit" loading={isSaving} disabled={!name.trim() || password.length < 4}>
						Create user
					</Button>
				</div>
			</form>
		</Modal>
	)
}

export default NewUserModal
