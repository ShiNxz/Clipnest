import { relations } from 'drizzle-orm'
import {
	bigint,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	real,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'
import {
	DEFAULT_SITE_DESCRIPTION,
	DEFAULT_SITE_TITLE,
	SITE_DESCRIPTION_MAX_LENGTH,
	SITE_TITLE_MAX_LENGTH,
} from 'shared'

export const postKind = pgEnum('post_kind', ['image', 'video'])

/** There is only ever one settings row, and this is its id. */
export const SETTINGS_ROW_ID = 1

/**
 * Site-wide settings — a single row, id 1.
 *
 * The site's name lives here rather than in the environment because
 * `WEBSITE_NAME` is inlined into the Next bundle at build time, so changing it
 * means a rebuild. This is read per request instead: an admin can re-title the
 * site for their group — or a single party — from /admin and have it show up in
 * the header, on the login screen and in the page metadata on the next load.
 */
export const settings = pgTable('settings', {
	id: integer('id').primaryKey().default(SETTINGS_ROW_ID),
	title: varchar('title', { length: SITE_TITLE_MAX_LENGTH }).notNull().default(DEFAULT_SITE_TITLE),
	/** Tagline under the title on /login, and the meta description for search and link previews. */
	description: varchar('description', { length: SITE_DESCRIPTION_MAX_LENGTH })
		.notNull()
		.default(DEFAULT_SITE_DESCRIPTION),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	/** Display name, exactly as the admin typed it. */
	name: varchar('name', { length: 60 }).notNull(),
	/**
	 * Lowercased name. Logging in is "pick your name from the list", so names
	 * have to be unique — and "Nissim" must not be a second account next to
	 * "nissim". Postgres has no case-insensitive unique index without citext,
	 * so the folded form is stored alongside.
	 */
	nameKey: varchar('name_key', { length: 60 }).notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	avatarUrl: text('avatar_url').notNull(),
	isAdmin: boolean('is_admin').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const posts = pgTable(
	'posts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		authorId: uuid('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		caption: text('caption').notNull().default(''),
		kind: postKind('kind').notNull(),
		/**
		 * R2 object key, and the only address stored.
		 *
		 * The public URL used to live here beside it, which meant every row was
		 * stamped with whatever bucket domain was configured the day it was
		 * written — and every one of them broke the day that domain changed.
		 * `publicUrl(key)` builds it from `R2_PUBLIC_URL` on the way out instead,
		 * so moving the bucket is an env change and nothing more.
		 */
		key: text('key').notNull().unique(),
		mime: text('mime').notNull(),
		/** Bytes. `number` mode is fine: JS integers hold sizes up to 9 PB exactly. */
		size: bigint('size', { mode: 'number' }).notNull().default(0),
		width: integer('width'),
		height: integer('height'),
		/** Seconds, videos only. */
		duration: real('duration'),
		/**
		 * When this post was opened to the public — null for every post until
		 * somebody deliberately shares it.
		 *
		 * The whole site is members-only, so this single nullable column is the one
		 * thing standing between a post and the open internet: `/public/posts/:id`
		 * refuses to answer for a row where it's null. A timestamp rather than a
		 * boolean because "shared, and since when" is the question anyone auditing
		 * this will actually ask.
		 */
		sharedAt: timestamp('shared_at', { withTimezone: true }),
		/**
		 * Who made it public — not necessarily the author, since anyone in the group
		 * can share. Kept so the badge on the post can say whose decision it was,
		 * and so they can take it back.
		 *
		 * `set null` rather than cascade: deleting the sharer must not delete
		 * somebody else's post. It leaves the post shared but unattributed, which
		 * only the author or an admin can then undo — both of whom already could.
		 */
		sharedById: uuid('shared_by_id').references(() => users.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	table => ({
		createdAtIdx: index('posts_created_at_idx').on(table.createdAt),
		authorIdx: index('posts_author_id_idx').on(table.authorId),
	}),
)

export const postLikes = pgTable(
	'post_likes',
	{
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	table => ({
		/**
		 * The pair *is* the row — liking twice is the same like. Enforcing that here
		 * rather than in the route means a double-click that races itself can't
		 * write two rows and inflate the count.
		 *
		 * It also indexes `post_id` on its own (leading column), which is the only
		 * way likes are ever looked up.
		 */
		pk: primaryKey({ columns: [table.postId, table.userId] }),
	}),
)

export const comments = pgTable(
	'comments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		authorId: uuid('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	table => ({
		// Comments are always read as "this post's, oldest first".
		postIdx: index('comments_post_id_created_at_idx').on(table.postId, table.createdAt),
	}),
)

/** Same shape as `post_likes`, one table down: one like per person per comment. */
export const commentLikes = pgTable(
	'comment_likes',
	{
		commentId: uuid('comment_id')
			.notNull()
			.references(() => comments.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	table => ({
		pk: primaryKey({ columns: [table.commentId, table.userId] }),
	}),
)

export const usersRelations = relations(users, ({ many }) => ({
	posts: many(posts),
	likes: many(postLikes),
	comments: many(comments),
	commentLikes: many(commentLikes),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(users, {
		fields: [posts.authorId],
		references: [users.id],
	}),
	likes: many(postLikes),
	comments: many(comments),
}))

export const postLikesRelations = relations(postLikes, ({ one }) => ({
	post: one(posts, {
		fields: [postLikes.postId],
		references: [posts.id],
	}),
	user: one(users, {
		fields: [postLikes.userId],
		references: [users.id],
	}),
}))

export const commentsRelations = relations(comments, ({ one, many }) => ({
	post: one(posts, {
		fields: [comments.postId],
		references: [posts.id],
	}),
	author: one(users, {
		fields: [comments.authorId],
		references: [users.id],
	}),
	likes: many(commentLikes),
}))

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
	comment: one(comments, {
		fields: [commentLikes.commentId],
		references: [comments.id],
	}),
	user: one(users, {
		fields: [commentLikes.userId],
		references: [users.id],
	}),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type PostLike = typeof postLikes.$inferSelect
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
export type CommentLike = typeof commentLikes.$inferSelect
export type Settings = typeof settings.$inferSelect
