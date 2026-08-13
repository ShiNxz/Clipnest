/** @type {import('next').NextConfig} */
const nextConfig = {
	// Workspace packages ship raw TypeScript — Next has to compile them itself.
	transpilePackages: ['backend-api', 'shared'],
	experimental: {
		optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
	},
	env: {
		API: process.env.API,
		// Optional. Only shared posts need it, for their canonical and og: URLs;
		// unset, they're built from the request's own host instead.
		WEBSITE_URL: process.env.WEBSITE_URL,
	},
}

module.exports = nextConfig
