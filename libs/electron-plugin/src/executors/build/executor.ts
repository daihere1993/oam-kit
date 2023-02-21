import { BuildExecutorSchema } from './schema';
import { ExecutorContext, logger } from '@nrwl/devkit';
import { build, Platform, Arch, createTargets, Configuration, CliOptions, FileSet } from 'electron-builder';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { platform } from 'os';

const writeFileAsync = (path: string, data: string) => promisify(writeFile)(path, data, { encoding: 'utf8' });

export default async function runExecutor(rawOptions: BuildExecutorSchema, context: ExecutorContext) {
  console.log('Executor ran for Build', rawOptions);
  let success = false;
  try {
    const { sourceRoot } = getSourceRoot(context);

    let options = normalizePackagingOptions(rawOptions, context.root, sourceRoot);
    options = addMissingDefaultOptions(options);

    const platforms: Platform[] = _createPlatforms(options.platform);
    const targets: Map<Platform, Map<Arch, string[]>> = createTargets(platforms, null, options.arch);
    const baseConfig: Configuration = _createBaseConfig(options, context);
    const config: Configuration = _createConfigFromOptions(options, baseConfig);
    const normalizedOptions: CliOptions = _normalizeBuilderOptions(targets, config, rawOptions);

    await beforeBuild(options.root, options.sourcePath, options.name);
    await build(normalizedOptions);
  
    success = true;
  } catch (error) {
    logger.error(error);
  }

  return { success };
}

function getSourceRoot(context: ExecutorContext): { sourceRoot: string; projectRoot: string } {
  const { sourceRoot, root } = context.workspace.projects[context.projectName];

  if (sourceRoot && root) {
    return { sourceRoot, projectRoot: root };
  }
  
  throw new Error('Project does not have a sourceRoot or root. Please define both.');
}

function normalizePackagingOptions<T extends BuildExecutorSchema>(options: T, root: string, sourceRoot: string): T {
  return {
    ...options,
    root,
    sourceRoot
  };
}

function addMissingDefaultOptions(options: BuildExecutorSchema): BuildExecutorSchema {
  // remove unset options (use electron builder default values where possible)
  Object.keys(options).forEach((key) => (options[key] === '') && delete options[key]);

  return options;
}

function _createPlatforms(rawPlatforms: string | string[]): Platform[] {
  const platforms: Platform[] = [];

  if (!rawPlatforms) {
    const platformMap: Map<string, string> = new Map([['win32', 'windows'], ['darwin', 'mac'], ['linux', 'linux']]); 

    rawPlatforms = platformMap.get(platform());
  }

  if (typeof rawPlatforms === 'string') {
    rawPlatforms = [rawPlatforms];
  }

  if (Array.isArray(rawPlatforms)) {
    if (rawPlatforms.includes(Platform.WINDOWS.name)) {
      platforms.push(Platform.WINDOWS);
    }

    if (rawPlatforms.includes(Platform.MAC.name)) {
      platforms.push(Platform.MAC);
    }

    if (rawPlatforms.includes(Platform.LINUX.name)) {
      platforms.push(Platform.LINUX);
    }
  }

  return platforms;
}

function _createBaseConfig(options: BuildExecutorSchema, context: ExecutorContext): Configuration {
  const files: Array<FileSet | string> = options.files ?
    (Array.isArray(options.files) ? options.files : [options.files]) : Array<FileSet | string>();
  const outputPath = options.prepackageOnly ? 
    options.outputPath.replace('executables', 'packages') : options.outputPath;

  files.forEach(file => {
    if (file && typeof file === 'object' && file.from && file.from.length > 0) {
      file.from = resolve(options.sourcePath, file.from);
    }
  });

  return {
    directories: {
      ...options.directories,
      output: join(context.root, outputPath)
    },
    files: files.concat([
      './package.json',
      {
          from: resolve(options.sourcePath, options.frontendProject),
          to: options.frontendProject,
          filter: ['**/!(*.+(js|css).map)', 'assets']
      },
      {
          from: resolve(options.sourcePath, options.name),
          to: options.name,
          filter: ['main.js', '?(*.)preload.js', 'assets']
      },
      {
          from: resolve(options.sourcePath, options.name),
          to: '',
          filter: ['index.js', 'package.json']
      },      
      '!(**/*.+(js|css).map)',
    ])
  };
}

function _createConfigFromOptions(options: BuildExecutorSchema, baseConfig: Configuration): Configuration {
  const config = Object.assign({}, options, baseConfig);
      
  delete config.name;
  delete config.frontendProject;
  delete config.platform;
  delete config.arch;
  delete config.root;
  delete config.prepackageOnly;
  delete config['sourceRoot'];
  delete config['$schema'];
  delete config["publishPolicy"];
  delete config.sourcePath;
  delete config.outputPath;
  delete config["makerOptionsPath"];

  return config;
}

function _normalizeBuilderOptions(targets: Map<Platform, Map<Arch, string[]>>, config: Configuration, rawOptions: BuildExecutorSchema): CliOptions {
  const normalizedOptions: CliOptions = { config, publish: rawOptions.publishPolicy || null };

  if (rawOptions.prepackageOnly) {
    normalizedOptions.dir = true;
  } else {
    normalizedOptions.targets = targets
  }

  return normalizedOptions;
}

async function beforeBuild(projectRoot: string, sourcePath: string, appName: string) {
  await writeFileAsync(join(projectRoot, sourcePath, appName, 'index.js'), `const Main = require('./${appName}/main.js');`);
}
