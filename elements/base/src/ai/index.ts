/**
 * AI utilities stub — shared prompts and client wrappers for apps and cloud services.
 */

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function stubComplete(
  _messages: AiMessage[],
): Promise<string> {
  throw new Error(
    "[@altr/base/ai] AI client stub — wire provider SDK when ready.",
  );
}
