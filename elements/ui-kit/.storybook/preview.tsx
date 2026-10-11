import * as React from "react";
import type { Preview } from "@storybook/react-vite";

import "../src/styles/globals.css";
import { themeFamilies } from "../src/theme";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: "Apolyx theme family",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: themeFamilies.map((value) => ({
          value,
          title: value,
        })),
        dynamicTitle: true,
      },
    },
    mode: {
      description: "Color mode",
      toolbar: {
        title: "Mode",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "default",
    mode: "light",
  },
  decorators: [
    (Story, context) => {
      const family = String(context.globals.theme ?? "default");
      const mode = String(context.globals.mode ?? "light");

      React.useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = family;
        root.classList.toggle("dark", mode === "dark");
      }, [family, mode]);

      return (
        <div className="min-h-24 bg-background p-8 text-foreground">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
