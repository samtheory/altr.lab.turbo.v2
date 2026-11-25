"use client";

import {
  MegaNav,
  MegaNavAnchor,
  MegaNavItem,
  MegaNavLink,
  MegaNavList,
  MegaNavPanel,
  MegaNavTrigger,
} from "@altr/apolyx";

export default function MegaNavDemo() {
  return (
    <div className="min-h-52 w-full max-w-xl pt-2">
      <MegaNav>
        <MegaNavList>
          <MegaNavItem value="products">
            <MegaNavTrigger>Products</MegaNavTrigger>
            <MegaNavPanel>
              <div className="grid gap-1">
                <MegaNavLink
                  href="#kit"
                  title="Apolyx Kit"
                  description="Tokens, primitives, and motion."
                />
                <MegaNavLink
                  href="#cli"
                  title="apolyx CLI"
                  description="Add components to any app."
                />
                <MegaNavLink
                  href="#studio"
                  title="Docs studio"
                  description="MDX playground and registry."
                />
              </div>
            </MegaNavPanel>
          </MegaNavItem>
          <MegaNavItem value="resources">
            <MegaNavTrigger>Resources</MegaNavTrigger>
            <MegaNavPanel>
              <div className="grid gap-1">
                <MegaNavLink href="#guides" title="Guides" description="Install and theming." />
                <MegaNavLink href="#changelog" title="Changelog" description="What shipped." />
              </div>
            </MegaNavPanel>
          </MegaNavItem>
          <li>
            <MegaNavAnchor href="#pricing">Pricing</MegaNavAnchor>
          </li>
        </MegaNavList>
      </MegaNav>
      <p className="mt-16 text-center text-xs text-muted-foreground">Hover a trigger to open a panel.</p>
    </div>
  );
}
