const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Una sola copia de React (evita "Invalid hook call" en monorepo)
config.resolver.extraNodeModules = {
  react: path.dirname(require.resolve('react/package.json', { paths: [projectRoot] })),
  'react-native': path.dirname(require.resolve('react-native/package.json', { paths: [projectRoot] })),
};

module.exports = config;
