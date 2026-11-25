"use client";

import { Badge, BeamCanvas, BeamConnections, BeamNode } from "@altr/apolyx";

const LINKS = [
  { from: { x: 0.14, y: 0.78 }, to: { x: 0.38, y: 0.42 }, curvature: 0.16 },
  { from: { x: 0.38, y: 0.42 }, to: { x: 0.62, y: 0.22 }, curvature: 0.12 },
  { from: { x: 0.38, y: 0.42 }, to: { x: 0.78, y: 0.62 }, curvature: -0.08 },
  { from: { x: 0.62, y: 0.22 }, to: { x: 0.88, y: 0.38 }, curvature: 0.14 },
] as const;

export default function Demo() {
  return (
    <BeamCanvas className="h-52 w-full max-w-lg rounded-xl border border-border bg-card/50 p-2">
      <BeamConnections links={[...LINKS]} />
      <BeamNode x={0.14} y={0.78}>
        <Badge variant="outline">Input</Badge>
      </BeamNode>
      <BeamNode x={0.38} y={0.42}>
        <Badge>Router</Badge>
      </BeamNode>
      <BeamNode x={0.62} y={0.22}>
        <Badge variant="secondary">Model</Badge>
      </BeamNode>
      <BeamNode x={0.78} y={0.62}>
        <Badge variant="outline">Tools</Badge>
      </BeamNode>
      <BeamNode x={0.88} y={0.38}>
        <Badge variant="secondary">Output</Badge>
      </BeamNode>
    </BeamCanvas>
  );
}