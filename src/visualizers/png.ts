import svg2img from 'svg2img';
import { instance } from '@viz-js/viz';
import { writeFileSync } from 'fs';
import { DependencyGraph } from '../dep-graph';
import { createDOT } from './dot';
import { RealLSOptions } from '../options';

export function handlePNG(G: DependencyGraph, options: RealLSOptions) {
  const dot = createDOT(G);
  drawPNG(dot, options.output ?? 'dep.png');
  return true;
}

async function drawPNG(dot: string, outputFile = 'dep.png') {
  const viz = await instance();
  const svg = viz.renderString(dot, { format: 'svg' });
  return new Promise<void>((resolve, reject) => {
    svg2img(svg, { format: 'png' as any, quality: 1000 }, (error, buffer) => {
      if (error) return reject(error);
      writeFileSync(outputFile, buffer);
      console.info(`PNG saved to ${outputFile}`);
      return resolve();
    });
  });
}
