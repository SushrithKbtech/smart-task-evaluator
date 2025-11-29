// app/broken-samples/samples/ui.ts

const brokenUI = `
import React, { useState, useEffect } from "react";

// BROKEN: UI component re-renders infinitely, wrong state updates,
// missing keys, and incorrect JSX

export default function CounterBroken() {
  const [count, setCount] = useState(0);

  // Wrong: triggers infinite re-renders
  useEffect(() => {
    setCount(count + 1);
  });

  return (
    <div>
      <h1>Counter: {count}</h1>

      <button onClick={() => setCount(count + 1)}>
        Click Me
      </button>

      <ul>
        {[1, 2, 3].map((item) => {
          return <li>{item}</li>; // Missing key
        })}
      </ul>
    </div>
  );
}
`;

export default brokenUI;
