import { getSiteSettings } from '@/utils/site'
import Link from 'next/link'
import { IoLockClosedOutline } from 'react-icons/io5'

/**
 * What a dead share link looks like.
 *
 * Reached for three different reasons — the post was never shared, the share
 * was taken back, or the id is simply wrong — and it deliberately reads the
 * same for all three. The API doesn't distinguish them either: telling someone
 * "that one exists, but it's private" is telling them something.
 */
const NotShared = async () => {
	const { title } = await getSiteSettings()

	return (
		<div className="relative isolate flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
			<div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 opacity-[0.08] blur-[130px]" />

			<IoLockClosedOutline size={30} className="text-slate-600" />

			<div>
				<h1 className="text-lg font-semibold text-slate-200">This post isn’t public</h1>
				<p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
					The link may have expired, or whoever shared it has made the post private again.
				</p>
			</div>

			<Link
				href="/login"
				className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
			>
				Log in to {title}
			</Link>
		</div>
	)
}

export default NotShared
