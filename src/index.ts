import { RealLSOptions, FormatOption } from './options';
import { DependencyGraph } from './dep-graph';
import { handleDOT } from './visualizers/dot';
import { handlePNG } from './visualizers/png';
import { handleSVG } from './visualizers/svg';
import { handleJSON } from './visualizers/json';
import { handleASCII } from './visualizers/ascii';

export async function printDependencyPaths(
  specifier: string,
  options: RealLSOptions,
): Promise<boolean> {
  const G = await DependencyGraph.createDependencyGraph(specifier, options);

  if (options.format === FormatOption.dot) {
    return handleDOT(G);
  }
  if (options.format === FormatOption.svg) {
    return handleSVG(G, options);
  }
  if (options.format === FormatOption.png) {
    return handlePNG(G, options);
  }
  if (options.format === FormatOption.json) {
    return handleJSON(G, options);
  }
  return handleASCII(G, options);
}

export { DependencyGraph } from './dep-graph';
export { DependencyTreeLoader } from './dep-tree-loader';
