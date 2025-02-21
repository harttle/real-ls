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
  maxPaths?: number;
}

export interface RealLSOptions extends PrintOptions {
  includeDev?: boolean;
  includePeer?: boolean;
  includeOptional?: boolean;
  output?: string;
  root?: string[];
}
