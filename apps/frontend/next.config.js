/** @type {import('next').NextConfig} */
const nextConfig = {
	// Workspace packages ship raw TypeScript — Next has to compile them itself.
	transpilePackages: ['backend-api', 'shared'],
	experimental: {
		optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
	},
	env: {
		API: process.env.API,
	},
}

module.exports = nextConfig
