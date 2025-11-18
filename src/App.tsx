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
    <div className="w-full flex justify-center items-center min-h-screen bg-gray-50 ">
      <div className="w-full max-w-[700px] flex items-center flex-col gap-4 p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800 caret-transparent">
          Emoji Generator
        </h1>
        <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl caret-transparent ">
          😊
        </div>
        <input
          value={input}
          onChange={handleChange}
          placeholder="Type in English only..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <div className="w-full min-h-12 text-3xl text-center font-medium text-gray-800 ">
          {loading ? "⏳" : output}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(output || "")}
            className="w-28 h-12 bg-gray-600 text-white rounded-md font-medium text-xl active:scale-95 transition flex items-center justify-center"
          >
            Copy
          </button>

          <button
            onClick={() =>
              window.open(
                `https://api.whatsapp.com/send?text=${encodeURIComponent(
                  output
                )}`,
                "_blank"
              )
            }
            className="w-28 h-12 bg-green-600 text-white rounded-md text-sm active:scale-95 transition flex items-center justify-center"
          >
            <img
              src="https://cdn.jsdelivr.net/npm/simple-icons/icons/whatsapp.svg"
              className="w-7 h-7 invert"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
