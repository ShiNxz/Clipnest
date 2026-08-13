'use client'

import Avatar from '@/app/UI/Avatar'
import { useSite } from '@/app/UI/SiteProvider'
import eden from '@/utils/eden'
import useAuth, { AUTH_KEY } from '@/utils/useAuth'
import { Button, Loader, PasswordInput, Select } from '@mantine/core'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR, { mutate } from 'swr'

const LoginPage = () => {
	const router = useRouter()
	const { title, description } = useSite()

	const [userId, setUserId] = useState<string | null>(null)
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Already signed in? Don't make them do it again — the cookie lasts a year.
	const { data: me, isLoading: isCheckingSession } = useAuth()
	useEffect(() => {
		if (me) router.replace('/')
	}, [me, router])

	const { data: users, isLoading: isLoadingUsers } = useSWR('login-users', async () => {
		const { data, error: usersError } = await eden.auth.users.get()
		if (usersError) throw usersError
		return data
	})

	const selected = users?.find(user => user.id === userId)

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!userId || !password || isSubmitting) return

		setIsSubmitting(true)
		setError(null)

		const { data, error: loginError } = await eden.auth.login.post({ userId, password })

		if (loginError || !data) {
			setError('That password does not match')
			setPassword('')
			setIsSubmitting(false)
			return
		}

		// Prime the session cache so the feed doesn't flash its loading state.
		await mutate(AUTH_KEY, data, false)
		router.replace('/')
	}

	if (isCheckingSession || me) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader color="indigo" />
			</div>
		)
	}

	return (
		<div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4">
			{/* `isolate` on the parent is what makes this visible: at `-z-10` with no
			    stacking context to hold it, it falls back to the root and paints
			    underneath the body's own opaque background. */}
			<div className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 opacity-20 blur-[130px]" />

			<form
				onSubmit={handleSubmit}
				className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl"
			>
				<div className="mb-6 text-center">
					<div className="mb-2 text-3xl">🎬</div>
					<h1 className="text-xl font-extrabold tracking-tight text-white">{title}</h1>
					{description ? <p className="text-sm text-slate-400">{description}</p> : null}
				</div>

				<div className="flex flex-col gap-4">
					<Select
						label="Who are you?"
						placeholder={isLoadingUsers ? 'Loading…' : 'Pick your name'}
						searchable
						nothingFoundMessage="No one by that name"
						disabled={isLoadingUsers}
						value={userId}
						onChange={value => {
							setUserId(value)
							setError(null)
						}}
						data={(users ?? []).map(user => ({ value: user.id, label: user.name }))}
						leftSection={selected ? <Avatar src={selected.avatarUrl} name={selected.name} size={22} /> : undefined}
						comboboxProps={{ withinPortal: true }}
						autoFocus
					/>

					<PasswordInput
						label="Password"
						placeholder="••••••••"
						value={password}
						onChange={event => {
							setPassword(event.currentTarget.value)
							setError(null)
						}}
						error={error}
						disabled={!userId}
					/>

					<Button type="submit" loading={isSubmitting} disabled={!userId || !password} fullWidth>
						Let me in
					</Button>
				</div>
			</form>
		</div>
	)
}

export default LoginPage
