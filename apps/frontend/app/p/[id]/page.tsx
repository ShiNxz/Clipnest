import Avatar from '@/app/UI/Avatar'
import eden from '@/utils/eden'
import { formatDate } from '@/utils/format'
import { siteOrigin } from '@/utils/origin'
import { getSiteSettings } from '@/utils/site'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { IoArrowForward, IoChatbubbleOutline, IoHeart, IoLockClosedOutline } from 'react-icons/io5'
import { sharePath } from 'shared'

type Props = { params: { id: string } }

/**
 * The shared post, or null if it isn't shared (or never existed — the API
 * deliberately doesn't distinguish).
 *
 * `cache` because the page is rendered twice per request, once for
 * `generateMetadata` and once for the body, and a link preview should not cost
 * two round trips.
 */
const getSharedPost = cache(async (id: string) => {
	try {
		const { data } = await eden.public.posts({ id }).get({ fetch: { cache: 'no-store' } })
		return data ?? null
	} catch {
		// An API that's down must render as "not available" rather than a stack
		// trace on a page that strangers are the whole audience for.
		return null
	}
})

/** Long captions make bad titles; browsers and search results cut them anyway. */
const truncate = (text: string, limit: number) => {
	const flat = text.replace(/\s+/g, ' ').trim()
	return flat.length > limit ? `${flat.slice(0, limit - 1).trimEnd()}…` : flat
}

/**
 * What a crawler and a chat app see.
 *
 * This is the entire point of sharing: the link gets pasted somewhere, and what
 * unfurls has to be the clip itself, not the site's generic card. Images get an
 * `og:image` and the large Twitter card. Videos get `og:video`, which Discord,
 * Telegram, Facebook and iMessage will play inline — but no `og:image`, since
 * nothing generates a thumbnail (the grid fakes one client-side with a `#t=0.1`
 * fragment, which a crawler can't do). A video therefore falls back to a plain
 * summary card on Twitter/X: the alternative is a player card, which needs an
 * embeddable iframe URL and Twitter's own approval.
 */
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
	const [post, site] = await Promise.all([getSharedPost(params.id), getSiteSettings()])

	// Nothing to describe, and nothing that should be indexed either.
	if (!post) return { title: 'Post not available', robots: { index: false, follow: false } }

	const url = `${siteOrigin()}${sharePath(post.id)}`
	const caption = post.caption.trim()

	const title = caption ? truncate(caption, 70) : `${post.author.name} on ${site.title}`
	const description = caption
		? truncate(caption, 200)
		: `A ${post.kind === 'video' ? 'clip' : 'meme'} ${post.author.name} posted on ${site.title}.`

	const media =
		post.kind === 'video'
			? {
					videos: [
						{ url: post.url, width: post.width ?? undefined, height: post.height ?? undefined, type: post.mime },
					],
				}
			: {
					images: [{ url: post.url, width: post.width ?? undefined, height: post.height ?? undefined, alt: title }],
				}

	return {
		title,
		description,
		// The one part of the site worth finding. Everything else is noindex —
		// see the root layout.
		robots: { index: true, follow: true },
		alternates: { canonical: url },
		openGraph: {
			type: post.kind === 'video' ? 'video.other' : 'article',
			url,
			siteName: site.title,
			title,
			description,
			publishedTime: new Date(post.createdAt).toISOString(),
			...media,
		},
		twitter: {
			card: post.kind === 'video' ? 'summary' : 'summary_large_image',
			title,
			description,
			...(post.kind === 'video' ? {} : { images: [post.url] }),
		},
	}
}

/**
 * One post, opened to the world.
 *
 * A server component on purpose: this is the only page in the app a crawler
 * will ever read, so its content has to be in the HTML rather than assembled
 * after a fetch. It also sits outside the `(app)` route group, which is what
 * keeps it clear of the auth guard — there is no session here to check.
 *
 * Everything is read-only. There is no like button, no comment box and no way
 * to reach another post, because there is no way to *be* anyone here.
 */
const SharedPostPage = async ({ params }: Props) => {
	const [post, site] = await Promise.all([getSharedPost(params.id), getSiteSettings()])
	if (!post) notFound()

	const caption = post.caption.trim()
	const url = `${siteOrigin()}${sharePath(post.id)}`

	/**
	 * Structured data, so a search engine indexes this as the clip it is rather
	 * than as a page with some text on it. Deliberately thin: the same facts
	 * already on the page, and no `interactionStatistic` naming anyone.
	 */
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': post.kind === 'video' ? 'VideoObject' : 'ImageObject',
		'@id': url,
		name: caption || `${post.author.name} on ${site.title}`,
		description: caption || undefined,
		uploadDate: new Date(post.createdAt).toISOString(),
		author: { '@type': 'Person', name: post.author.name },
		contentUrl: post.url,
		encodingFormat: post.mime,
		// An image is its own thumbnail. A video has none to give — nothing in the
		// app generates one, and pointing this at the mp4 would be a lie.
		...(post.kind === 'image' ? { thumbnailUrl: post.url } : {}),
		...(post.duration ? { duration: `PT${Math.round(post.duration)}S` } : {}),
		...(post.width && post.height ? { width: post.width, height: post.height } : {}),
	}

	return (
		<div className="relative isolate min-h-screen">
			{/*
			  The caption is inside this, and a caption can contain anything someone
			  typed — including the four characters that close a script tag. JSON
			  escapes quotes but not `<`, so every `<` is rewritten to its <
			  escape: the same string to a JSON parser, and inert to an HTML one.
			*/}
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be the raw text of a script tag — React entity-escapes a text child and produces invalid JSON.
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
			/>

			<div className="pointer-events-none fixed left-1/2 top-[-10%] -z-10 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 opacity-[0.09] blur-[130px]" />

			<header className="border-b border-white/5">
				<div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
					<Link href="/" className="flex items-center gap-2 text-base font-extrabold tracking-tight text-white">
						<span className="text-lg">🎬</span>
						{site.title}
					</Link>

					<Link
						href="/login"
						className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
					>
						Log in
					</Link>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-4 py-6">
				<article className="overflow-hidden rounded-2xl border border-white/5 bg-ink-900 shadow-lg shadow-black/20">
					<div className="flex items-center gap-3 px-4 py-3">
						<Avatar src={post.author.avatarUrl} name={post.author.name} size={36} />

						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-slate-100">{post.author.name}</p>
							<time dateTime={new Date(post.createdAt).toISOString()} className="text-xs text-slate-500">
								{formatDate(post.createdAt)}
							</time>
						</div>
					</div>

					<div className="bg-black">
						{post.kind === 'video' ? (
							// Plain <video>, not the react-player used inside the app: this
							// page is server-rendered for crawlers, and the native element is
							// what a crawler (and a browser with no JS) can actually see.
							<video
								src={post.url}
								controls
								playsInline
								preload="metadata"
								width={post.width ?? undefined}
								height={post.height ?? undefined}
								className="max-h-[75vh] w-full bg-black object-contain"
							/>
						) : (
							<img
								src={post.url}
								alt={caption || `Posted by ${post.author.name}`}
								width={post.width ?? undefined}
								height={post.height ?? undefined}
								className="max-h-[75vh] w-full object-contain"
							/>
						)}
					</div>

					<div className="space-y-3 px-4 py-3">
						{caption ? (
							<h1 className="whitespace-pre-wrap text-sm font-normal text-slate-200">{caption}</h1>
						) : (
							<h1 className="sr-only">
								{post.author.name} on {site.title}
							</h1>
						)}

						{/* Tallies, not buttons — and no names behind them. Nobody who liked
						    this or commented on it agreed to be seen outside the group. */}
						<div className="flex items-center gap-4 border-t border-white/5 pt-3 text-sm text-slate-500">
							<span className="inline-flex items-center gap-1.5">
								<IoHeart size={16} className="text-rose-500/70" />
								{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
							</span>
							<span className="inline-flex items-center gap-1.5">
								<IoChatbubbleOutline size={15} />
								{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
							</span>
						</div>
					</div>
				</article>

				<aside className="mt-6 rounded-2xl border border-dashed border-white/10 px-5 py-6 text-center">
					<IoLockClosedOutline size={22} className="mx-auto mb-2 text-slate-600" />

					<p className="text-sm text-slate-300">
						Someone shared this one post from <span className="font-semibold text-white">{site.title}</span>.
					</p>
					<p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
						Everything else here is private — a feed for one group of friends, where only the people who were given an
						account can see anything at all.
					</p>

					<Link
						href="/login"
						className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
					>
						Log in
						<IoArrowForward size={14} />
					</Link>
				</aside>
			</main>
		</div>
	)
}

export default SharedPostPage
