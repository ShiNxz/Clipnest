'use client'

import Header from '@/app/UI/Header'
import useAuth from '@/utils/useAuth'
import { Loader } from '@mantine/core'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Everything inside this group needs a session.
 *
 * The redirect waits for `isLoading` to settle — acting on `data === null`
 * while the check is still in flight would bounce a valid session to /login on
 * every hard refresh.
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => {
	const { data: user, isLoading } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (!isLoading && !user) router.replace('/login')
	}, [isLoading, user, router])

	if (isLoading || !user) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader color="indigo" />
			</div>
		)
	}

	return (
		<div className="min-h-screen">
			<Header user={user} />
			<main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
		</div>
	)
}

export default AppLayout
