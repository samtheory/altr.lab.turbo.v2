"use client";

import { FileTree } from "@altr/apolyx";

export default function Demo() { return (<FileTree items={[{ name: "src", children: [{ name: "index.ts" }] }]} />); }
