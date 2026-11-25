import type * as React from "react";

export type PlaygroundControl =
  | {
      kind: "enum";
      key: string;
      label: string;
      options: { value: string; label: string }[];
    }
  | {
      kind: "boolean";
      key: string;
      label: string;
    }
  | {
      kind: "string";
      key: string;
      label: string;
      placeholder?: string;
    };

export type PlaygroundValues = Record<string, string | boolean>;

export type PlaygroundSetValue = (key: string, value: string | boolean) => void;

export type PlaygroundSchema = {
  id: string;
  component: string;
  installName: string;
  docsPath: string;
  controls: PlaygroundControl[];
  defaults: PlaygroundValues;
  render: (values: PlaygroundValues, setValue: PlaygroundSetValue) => React.ReactNode;
  toJsx: (values: PlaygroundValues) => string;
};
