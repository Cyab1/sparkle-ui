export async function askClaude(
  system: string,
  prompt: string,
  onChunk: (full: string) => void,
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    onChunk(
      "⚠️ Add VITE_OPENAI_API_KEY to your .env file to enable AI features.",
    );
    return "";
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1000,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n")) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const j = JSON.parse(line.slice(6));
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk(full);
        }
      } catch {
        /* skip */
      }
    }
  }

  return full;
}
// ```

// Then create a `.env` file in your project root and add:

// ```;
// VITE_OPENAI_API_KEY = your_openai_key_here;
