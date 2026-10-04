const path = require('path');
const fs = require('fs-extra');
const CopyPlugin = require('copy-webpack-plugin');
const tar = require('tar');

const distDir = path.resolve(__dirname, 'dist');
const publishDir = path.resolve(__dirname, 'publish');
const srcDir = path.resolve(__dirname, 'src');

function getManifest() {
  const manifestPath = path.resolve(srcDir, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function getPluginConfig() {
  const configPath = path.resolve(__dirname, 'plugin.config.json');
  return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : { extraScripts: [] };
}

module.exports = (env, argv) => {
  const joplinConfigIndex = process.argv.indexOf('--joplin-plugin-config');
  const command = joplinConfigIndex !== -1 ? process.argv[joplinConfigIndex + 1] : 'buildMain';

  if (command === 'buildMain') {
    fs.emptyDirSync(distDir);
    fs.emptyDirSync(publishDir);

    return {
      mode: 'production',
      target: 'node',
      entry: './src/index.ts',
      output: {
        path: distDir,
        filename: 'index.js',
        libraryTarget: 'commonjs',
      },
      resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: { api: path.resolve(__dirname, 'api') },
      },
      module: {
        rules: [{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }],
      },
      plugins: [
        new CopyPlugin({
          patterns: [{ from: '**/*', to: distDir, context: srcDir, globOptions: { ignore: ['**/*.ts', '**/*.tsx'] } }],
        }),
      ],
    };
  }

  if (command === 'buildExtraScripts') {
    const config = getPluginConfig();
    const extraScripts = config.extraScripts || [];
    if (!extraScripts.length) {
      process.exit(0);
    }

    const entry = {};
    for (const script of extraScripts) {
      const parsed = path.parse(script);
      entry[parsed.name] = path.resolve(srcDir, script);
    }

    return {
      mode: 'production',
      target: 'node',
      entry,
      output: {
        path: distDir,
        filename: '[name].js',
        libraryTarget: 'commonjs',
      },
      resolve: {
        extensions: ['.ts', '.tsx', '.js'],
      },
      module: {
        rules: [{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }],
      },
    };
  }

  if (command === 'createArchive') {
    const manifest = getManifest();
    const jplPath = path.resolve(publishDir, `${manifest.id}.jpl`);

    tar.create(
      {
        strict: true,
        portable: true,
        file: jplPath,
        cwd: distDir,
        sync: true,
      },
      fs.readdirSync(distDir)
    );

    console.log(`\n Bundle successfully generated at: ${jplPath}\n`);
    process.exit(0);
  }
};
