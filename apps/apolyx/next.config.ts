import createMDX from "@next/mdx";
import rehypeShiki from "@shikijs/rehype";
import type { NextConfig } from "next";
import remarkGfm from "remark-gfm";

import { apolyxDark, apolyxLight } from "./src/lib/apolyx-shiki-themes";

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypeShiki,
        {
          themes: { light: apolyxLight, dark: apolyxDark },
          defaultColor: "light",
        },
      ],
    ],
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  transpilePackages: ["@altr/apolyx"],
};

export default withMDX(nextConfig);
