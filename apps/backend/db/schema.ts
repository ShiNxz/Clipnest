import { relations } from 'drizzle-orm'
import {
	bigint,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'

export const postKind = pgEnum('post_kind', ['image', 'video'])

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
		/** R2 object key — the source of truth. `url` is derived from it. */
		key: text('key').notNull().unique(),
		url: text('url').notNull(),
		mime: text('mime').notNull(),
		/** Bytes. `number` mode is fine: JS integers hold sizes up to 9 PB exactly. */
		size: bigint('size', { mode: 'number' }).notNull().default(0),
		width: integer('width'),
		height: integer('height'),
		/** Seconds, videos only. */
		duration: real('duration'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	table => ({
		createdAtIdx: index('posts_created_at_idx').on(table.createdAt),
		authorIdx: index('posts_author_id_idx').on(table.authorId),
	}),
)

export const usersRelations = relations(users, ({ many }) => ({
	posts: many(posts),
}))

export const postsRelations = relations(posts, ({ one }) => ({
	author: one(users, {
		fields: [posts.authorId],
		references: [users.id],
	}),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
