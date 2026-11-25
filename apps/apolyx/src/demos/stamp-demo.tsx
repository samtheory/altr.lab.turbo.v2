"use client";

import { Stamp } from "@altr/apolyx";

export default function StampDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-10 p-4">
      <Stamp shape="circle" orbit="Save now on sale">
        Sale
      </Stamp>
      <Stamp shape="square" variant="success" orbit="Just dropped" rotate={6}>
        New
      </Stamp>
      <Stamp shape="circle" variant="warning" orbit={false} rotate={-4}>
        Hot
      </Stamp>
    </div>
  );
}
