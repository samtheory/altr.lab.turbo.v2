"use client";

import { TestimonialReel } from "@altr/apolyx";

const items = [
  {
    quote: "We replaced bespoke motion primitives with Apolyx and shipped in half the time.",
    name: "Morgan Lee",
    role: "Design systems lead",
  },
  {
    quote: "Semantic tokens and reduced-motion defaults made accessibility reviews painless.",
    name: "Alex Kim",
    role: "Frontend engineer",
  },
];

export default function TestimonialReelDemo() {
  return <TestimonialReel items={items} />;
}