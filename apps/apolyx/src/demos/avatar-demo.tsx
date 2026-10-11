"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@altr/apolyx";

export default function AvatarDemo() {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src="https://github.com/samtheory.png" alt="samtheory" />
        <AvatarFallback>ST</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src="/missing.png" alt="Ada Lovelace" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
    </div>
  );
}
