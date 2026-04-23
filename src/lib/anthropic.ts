import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Anthropic レスポンスからテキストを安全に取り出す */
export function extractText(message: Anthropic.Message): string {
  const content = message.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Unexpected Anthropic response format");
  }
  return content.text;
}
