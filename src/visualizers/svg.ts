import { instance } from '@viz-js/viz';
import { writeFileSync } from 'fs';
import { DependencyGraph } from '../dep-graph';
import { createDOT } from './dot';
import { RealLSOptions } from '../options';

export async function handleSVG(G: DependencyGraph, options: RealLSOptions) {
  const dot = createDOT(G);
  const viz = await instance();
  const svg = viz.renderString(dot, { format: 'svg' });
  const outputFile = options.output ?? 'dep.svg';
  writeFileSync(outputFile, svg);
  console.info(`SVG saved to ${outputFile}`);
  return true;
}
