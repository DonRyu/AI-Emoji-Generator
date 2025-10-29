import { useEffect } from "react";

function App() {
  useEffect(() => {
    test();
  }, []);

  const test = async () => {
    const r = await fetch("http://localhost:3000/api/emoji", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "오늘 너무 피곤해" }),
    });
    const { emoji } = await r.json();
    console.log('emoji',emoji);
  };

  return (
    <>
      <div className={"bg-red-700"}>asdasdasdasd</div>
    </>
  );
}

export default App;
