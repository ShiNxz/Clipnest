'use client'

import Avatar from '@/app/UI/Avatar'
import { useSite } from '@/app/UI/SiteProvider'
import eden from '@/utils/eden'
import { AUTH_KEY, type Me } from '@/utils/useAuth'
import { Menu } from '@mantine/core'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { IoCloudUploadOutline, IoHomeOutline, IoLogOutOutline, IoShieldCheckmarkOutline } from 'react-icons/io5'
import { mutate } from 'swr'

const Header = ({ user }: { user: Me }) => {
	const pathname = usePathname()
	const router = useRouter()
	const { title } = useSite()

	const handleLogout = async () => {
		await eden.auth.logout.post()
		// Drop the cached session before navigating, or the login page bounces
		// straight back to the feed on a stale "logged in".
		await mutate(AUTH_KEY, null, false)
		router.replace('/login')
	}

	const links = [
		{ href: '/', label: 'Feed', icon: IoHomeOutline },
		{ href: '/upload', label: 'Upload', icon: IoCloudUploadOutline },
		...(user.isAdmin ? [{ href: '/admin', label: 'Admin', icon: IoShieldCheckmarkOutline }] : []),
	]

	return (
		<header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
			<div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
				<Link href="/" className="mr-2 flex items-center gap-2 text-base font-extrabold tracking-tight text-white">
					<span className="text-lg">🎬</span>
					<span className="hidden sm:inline">{title}</span>
				</Link>

				<nav className="flex items-center gap-1">
					{links.map(({ href, label, icon: Icon }) => {
						const active = href === '/' ? pathname === '/' : pathname.startsWith(href)

						return (
							<Link
								key={href}
								href={href}
								className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
									active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
								}`}
							>
								<Icon size={16} />
								<span className="hidden sm:inline">{label}</span>
							</Link>
						)
					})}
				</nav>

				<div className="ml-auto">
					<Menu position="bottom-end" withArrow>
						<Menu.Target>
							<button type="button" className="flex items-center gap-2 rounded-full p-0 transition hover:opacity-80">
								<Avatar src={user.avatarUrl} name={user.name} size={32} />
								<span className="hidden pr-1 text-sm font-medium text-slate-300 sm:inline">{user.name}</span>
							</button>
						</Menu.Target>
						<Menu.Dropdown>
							<Menu.Label>{user.isAdmin ? 'Admin' : 'Signed in'}</Menu.Label>
							<Menu.Item color="red" leftSection={<IoLogOutOutline />} onClick={handleLogout}>
								Log out
							</Menu.Item>
						</Menu.Dropdown>
					</Menu>
				</div>
			</div>
		</header>
	)
}

export default Header
