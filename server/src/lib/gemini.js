/**
 * One code path for calling the Gemini generateContent API with structured
 * output. Used by the mail matcher (Inbox tab) and the CV generator.
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

/**
 * @param {object}  opts
 * @param {string}  opts.prompt        the full user prompt
 * @param {object}  opts.schema        a Gemini responseSchema (OpenAPI subset)
 * @param {number} [opts.temperature]  0..1, default 0.2
 * @param {string} [opts.model]        override the model
 * @param {string} [opts.apiKey]       override the key (defaults to GEMINI_API_KEY)
 * @param {number} [opts.timeoutMs]    default 45000
 * @returns {Promise<any>} the parsed JSON object the model returned
 */
export async function callGemini({
  prompt,
  schema,
  temperature = 0.2,
  model = DEFAULT_MODEL,
  apiKey = process.env.GEMINI_API_KEY || "",
  timeoutMs = 45000
}) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
        ...(schema ? { responseSchema: schema } : {})
      }
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${text.slice(0, 300)}`);
  }
}

export { DEFAULT_MODEL as GEMINI_MODEL };
