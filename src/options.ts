export const enum FormatOption {
  json = 'json',
  ascii = 'ascii',
  dot = 'dot',
  svg = 'svg',
  png = 'png',
}

export const enum PathOption {
  none = 'none',
  absolute = 'absolute',
  relative = 'relative',
}

export interface PrintOptions {
  format?: string;
  path?: string;
  // limit paths
  maxPaths?: number;
  // current working directory
  cwd?: string;
}

export interface FindDependencyPathsOptions extends PrintOptions {
  excludeDev?: boolean;
  excludePeer?: boolean;
  excludeOptional?: boolean;
  output?: string;
}
