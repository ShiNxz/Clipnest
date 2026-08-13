import Elysia from 'elysia'

// Routes
import AdminRoutes from './admin'
import AuthRoutes from './auth'
import PostRoutes from './posts'
import SettingsRoutes from './settings'
import UploadRoutes from './uploads'

const routes = new Elysia()
	.group('/auth', app => app.use(AuthRoutes))
	.group('/posts', app => app.use(PostRoutes))
	.group('/uploads', app => app.use(UploadRoutes))
	.group('/admin', app => app.use(AdminRoutes))
	.group('/settings', app => app.use(SettingsRoutes))

export default routes
