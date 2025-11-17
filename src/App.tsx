import { useState, useRef, type ChangeEvent } from "react";

export default function EmojiGenerator() {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheKey = "emojiCache";
  const cache = useRef<Record<string, string>>(
    JSON.parse(localStorage.getItem(cacheKey) || "{}")
  );

  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/gi, "")
      .replace(/\s+/g, " ");
  };

  const updateCache = (key: string, value: string) => {
    cache.current[key] = value;
    localStorage.setItem(cacheKey, JSON.stringify(cache.current));
  };

  const requestEmoji = async (text: string) => {
    setLoading(true);
    const normalized = normalize(text);
    if (cache.current[normalized]) {
      setOutput(cache.current[normalized]);
      setLoading(false);
      return;
    }
    const res = await fetch("/api/emoji", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (data.result) {
      updateCache(normalized, data.result);
      setOutput(data.result);
    }
    setLoading(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
    setInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.trim() !== "") requestEmoji(v);
      else setOutput("");
    }, 400);
  };

  return (
    <div
      style={{
        maxWidth: 320,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <input
        value={input}
        onChange={handleChange}
        placeholder="Type in English only..."
        style={{ padding: 8, border: "1px solid #aaa", borderRadius: 6 }}
      />
      <div style={{ minHeight: 40, fontSize: 28 }}>
        {loading ? "⏳" : output}
      </div>
    </div>
  );
}
