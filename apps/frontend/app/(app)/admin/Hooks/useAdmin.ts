import eden from '@/utils/eden'
import useSWR from 'swr'

type AdminPosts = NonNullable<Awaited<ReturnType<typeof eden.admin.posts.get>>['data']>
type AdminUsers = NonNullable<Awaited<ReturnType<typeof eden.admin.users.get>>['data']>

export type AdminPost = AdminPosts[number]
export type AdminUser = AdminUsers[number]

export const useAdminPosts = () =>
	useSWR('admin-posts', async () => {
		const { data, error } = await eden.admin.posts.get()
		if (error) throw error
		return data
	})

export const useAdminUsers = () =>
	useSWR('admin-users', async () => {
		const { data, error } = await eden.admin.users.get()
		if (error) throw error
		return data
	})

/** Eden puts the API's error message in `error.value`; unwrap it for the UI. */
const messageOf = (error: { value?: unknown } | null, fallback: string) => {
	const value = error?.value
	return typeof value === 'string' && value ? value : fallback
}

export const deleteAdminPost = async (id: string) => {
	const { error } = await eden.admin.posts({ id }).delete()
	if (error) throw new Error(messageOf(error, 'Could not delete the clip'))
}

export const createUser = async (input: {
	name: string
	password: string
	avatarUrl?: string
	isAdmin?: boolean
}) => {
	const { data, error } = await eden.admin.users.post(input)
	if (error) throw new Error(messageOf(error, 'Could not create the user'))
	return data
}

export const updateUser = async (
	id: string,
	input: { name?: string; password?: string; avatarUrl?: string; isAdmin?: boolean },
) => {
	const { data, error } = await eden.admin.users({ id }).patch(input)
	if (error) throw new Error(messageOf(error, 'Could not update the user'))
	return data
}

export const deleteUser = async (id: string) => {
	const { error } = await eden.admin.users({ id }).delete()
	if (error) throw new Error(messageOf(error, 'Could not delete the user'))
}

/**
 * Rename the site. Reading the settings is public — it's `/settings`, not
 * `/admin/settings` — but only an admin gets to write them.
 */
export const updateSettings = async (input: { title?: string; description?: string }) => {
	const { data, error } = await eden.settings.index.patch(input)
	if (error) throw new Error(messageOf(error, 'Could not save the site details'))
	return data
}
