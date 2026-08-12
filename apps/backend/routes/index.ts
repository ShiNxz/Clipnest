import Elysia from 'elysia'

// Routes
import AdminRoutes from './admin'
import AuthRoutes from './auth'
import PostRoutes from './posts'
import UploadRoutes from './uploads'

const routes = new Elysia()
	.group('/auth', app => app.use(AuthRoutes))
	.group('/posts', app => app.use(PostRoutes))
	.group('/uploads', app => app.use(UploadRoutes))
	.group('/admin', app => app.use(AdminRoutes))

export default routes
