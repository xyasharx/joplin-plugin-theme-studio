const path = require('path');
const crypto = require('crypto');
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
  return fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : { extraScripts: [] };
}

module.exports = (env, argv) => {
  const joplinConfigIndex = process.argv.indexOf('--joplin-plugin-config');
  const command = joplinConfigIndex !== -1 ? process.argv[joplinConfigIndex + 1] : 'buildMain';

  // 1. Build Main Entry Point (src/index.ts)
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
          patterns: [
            {
              from: '**/*',
              to: distDir,
              context: srcDir,
              globOptions: { ignore: ['**/*.ts', '**/*.tsx'] },
            },
          ],
        }),
      ],
    };
  }

  // 2. Build Extra Scripts (src/markdownTheme.ts)
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

  // 3. Create Archive (.jpl) & Joplin Registry Metadata (.json)
  if (command === 'createArchive') {
    const manifest = getManifest();
    const jplPath = path.resolve(publishDir, `${manifest.id}.jpl`);

    // Pack compiled files into .jpl archive
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

    // Compute SHA-256 hash required by Joplin's official plugin crawler
    const fileBuffer = fs.readFileSync(jplPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const pluginInfo = {
      ...manifest,
      _publish_hash: `sha256:${hash}`,
      _publish_commit: process.env.GITHUB_SHA || 'main',
    };

    fs.writeFileSync(
      path.resolve(publishDir, `${manifest.id}.json`),
      JSON.stringify(pluginInfo, null, 2)
    );

    console.log(`\n Successfully generated:`);
    console.log(` - JPL Bundle: ${jplPath}`);
    console.log(` - Hash Meta:  ${path.resolve(publishDir, `${manifest.id}.json`)}\n`);
    process.exit(0);
  }
};
