'use client'

import { deleteAdminPost, deleteUser, updateUser, useAdminPosts, useAdminUsers } from '@/app/(app)/admin/Hooks/useAdmin'
import Avatar from '@/app/UI/Avatar'
import NewUserModal from '@/app/UI/NewUserModal'
import SiteSettingsForm from '@/app/UI/SiteSettingsForm'
import { formatBytes, formatDuration, timeAgo } from '@/utils/format'
import useAuth from '@/utils/useAuth'
import { ActionIcon, Badge, Button, Loader, Menu, Tabs, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BsThreeDots } from 'react-icons/bs'
import { IoKeyOutline, IoPersonAddOutline, IoShieldCheckmarkOutline, IoTrashOutline } from 'react-icons/io5'
import { randomPassword } from 'shared'

const AdminPage = () => {
	const router = useRouter()
	const { data: me, isLoading: isCheckingSession } = useAuth()

	const { data: posts, isLoading: loadingPosts, mutate: refreshPosts } = useAdminPosts()
	const { data: users, isLoading: loadingUsers, mutate: refreshUsers } = useAdminUsers()

	const [isCreating, setIsCreating] = useState(false)

	// The API rejects non-admins anyway; this only avoids showing them a broken page.
	useEffect(() => {
		if (!isCheckingSession && me && !me.isAdmin) router.replace('/')
	}, [isCheckingSession, me, router])

	const notifyError = (err: unknown) =>
		notifications.show({
			title: 'That did not work',
			message: err instanceof Error ? err.message : 'Something went wrong',
			color: 'red',
		})

	const handleDeletePost = async (id: string, label: string) => {
		if (!window.confirm(`Delete ${label}? This also removes the file from storage.`)) return

		try {
			await deleteAdminPost(id)
			await refreshPosts()
			notifications.show({ message: 'Clip deleted', color: 'gray' })
		} catch (err) {
			notifyError(err)
		}
	}

	const handleDeleteUser = async (id: string, name: string, postCount: number) => {
		const warning = postCount
			? `Delete ${name} and their ${postCount} post${postCount > 1 ? 's' : ''}?`
			: `Delete ${name}?`
		if (!window.confirm(warning)) return

		try {
			await deleteUser(id)
			await Promise.all([refreshUsers(), refreshPosts()])
			notifications.show({ message: `${name} deleted`, color: 'gray' })
		} catch (err) {
			notifyError(err)
		}
	}

	const handleResetPassword = async (id: string, name: string) => {
		const password = randomPassword()

		try {
			await updateUser(id, { password })
			notifications.show({
				title: `New password for ${name}`,
				message: password,
				color: 'teal',
				autoClose: 15000,
			})
		} catch (err) {
			notifyError(err)
		}
	}

	const handleToggleAdmin = async (id: string, name: string, next: boolean) => {
		try {
			await updateUser(id, { isAdmin: next })
			await refreshUsers()
			notifications.show({ message: `${name} is ${next ? 'now an admin' : 'no longer an admin'}`, color: 'gray' })
		} catch (err) {
			notifyError(err)
		}
	}

	if (isCheckingSession || !me?.isAdmin) {
		return (
			<div className="flex justify-center py-20">
				<Loader color="indigo" />
			</div>
		)
	}

	return (
		<div>
			<h1 className="mb-5 text-xl font-bold text-white">Admin</h1>

			<Tabs defaultValue="clips">
				<Tabs.List>
					<Tabs.Tab value="clips">Clips {posts ? `(${posts.length})` : ''}</Tabs.Tab>
					<Tabs.Tab value="users">Users {users ? `(${users.length})` : ''}</Tabs.Tab>
					<Tabs.Tab value="site">Site</Tabs.Tab>
				</Tabs.List>

				{/* ------------------------------------------------------------ clips */}
				<Tabs.Panel value="clips" pt="lg">
					{loadingPosts ? (
						<div className="flex justify-center py-16">
							<Loader color="indigo" />
						</div>
					) : !posts?.length ? (
						<p className="py-16 text-center text-sm text-slate-500">Nothing has been posted yet.</p>
					) : (
						<div className="flex flex-col gap-2">
							{posts.map(post => (
								<div
									key={post.id}
									className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-900 p-2.5"
								>
									<div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black">
										{post.kind === 'video' ? (
											<video
												src={`${post.url}#t=0.1`}
												muted
												preload="metadata"
												className="h-full w-full object-cover"
											/>
										) : (
											<img src={post.url} alt="" className="h-full w-full object-cover" />
										)}
									</div>

									<div className="min-w-0 flex-1">
										<p className="truncate text-sm text-slate-200">
											{post.caption || <span className="text-slate-500">No caption</span>}
										</p>
										<p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
											<span className="inline-flex items-center gap-1.5">
												<Avatar src={post.author.avatarUrl} name={post.author.name} size={16} />
												{post.author.name}
											</span>
											<span>· {timeAgo(post.createdAt)}</span>
											<span>· {post.kind === 'video' ? (formatDuration(post.duration) ?? 'clip') : 'image'}</span>
											{post.size ? <span>· {formatBytes(post.size)}</span> : null}
										</p>
									</div>

									<Tooltip label="Delete clip">
										<ActionIcon
											variant="subtle"
											color="red"
											aria-label="Delete clip"
											onClick={() => handleDeletePost(post.id, post.caption || `${post.author.name}'s post`)}
										>
											<IoTrashOutline />
										</ActionIcon>
									</Tooltip>
								</div>
							))}
						</div>
					)}
				</Tabs.Panel>

				{/* ------------------------------------------------------------ users */}
				<Tabs.Panel value="users" pt="lg">
					<div className="mb-4 flex justify-end">
						<Button leftSection={<IoPersonAddOutline />} onClick={() => setIsCreating(true)}>
							New user
						</Button>
					</div>

					{loadingUsers ? (
						<div className="flex justify-center py-16">
							<Loader color="indigo" />
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{users?.map(user => (
								<div key={user.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-900 p-3">
									<Avatar src={user.avatarUrl} name={user.name} size={40} />

									<div className="min-w-0 flex-1">
										<p className="flex items-center gap-2 text-sm font-medium text-slate-100">
											{user.name}
											{user.isAdmin && (
												<Badge size="xs" variant="light" color="indigo" leftSection={<IoShieldCheckmarkOutline />}>
													admin
												</Badge>
											)}
											{user.id === me.id && (
												<Badge size="xs" variant="light" color="gray">
													you
												</Badge>
											)}
										</p>
										<p className="text-xs text-slate-500">
											{user.postCount} post{user.postCount === 1 ? '' : 's'} · joined {timeAgo(user.createdAt)}
										</p>
									</div>

									<Menu position="bottom-end" withArrow>
										<Menu.Target>
											<ActionIcon variant="subtle" color="gray" aria-label="User options">
												<BsThreeDots />
											</ActionIcon>
										</Menu.Target>
										<Menu.Dropdown>
											<Menu.Item leftSection={<IoKeyOutline />} onClick={() => handleResetPassword(user.id, user.name)}>
												Reset password
											</Menu.Item>
											<Menu.Item
												leftSection={<IoShieldCheckmarkOutline />}
												onClick={() => handleToggleAdmin(user.id, user.name, !user.isAdmin)}
												disabled={user.id === me.id}
											>
												{user.isAdmin ? 'Remove admin' : 'Make admin'}
											</Menu.Item>
											<Menu.Divider />
											<Menu.Item
												color="red"
												leftSection={<IoTrashOutline />}
												disabled={user.id === me.id}
												onClick={() => handleDeleteUser(user.id, user.name, user.postCount)}
											>
												Delete user
											</Menu.Item>
										</Menu.Dropdown>
									</Menu>
								</div>
							))}
						</div>
					)}
				</Tabs.Panel>

				{/* ------------------------------------------------------------- site */}
				<Tabs.Panel value="site" pt="lg">
					<SiteSettingsForm />
				</Tabs.Panel>
			</Tabs>

			<NewUserModal opened={isCreating} onClose={() => setIsCreating(false)} onCreated={refreshUsers} />
		</div>
	)
}

export default AdminPage
