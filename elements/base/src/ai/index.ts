/**
 * AI utilities stub — shared prompts / client wrappers for cloud/ai-bot-agent and apps.
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
