import createMDX from "@next/mdx";
import rehypeShiki from "@shikijs/rehype";
import type { NextConfig } from "next";
import remarkGfm from "remark-gfm";

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypeShiki,
        { themes: { light: "github-light", dark: "github-dark" } },
      ],
    ],
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  transpilePackages: ["@altr/apolyx"],
};

export default withMDX(nextConfig);
