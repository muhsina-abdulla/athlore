const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// drizzle-kit emits .sql migration files that the app bundles.
config.resolver.sourceExts.push('sql');

module.exports = config;
