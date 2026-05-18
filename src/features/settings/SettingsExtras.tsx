import { useState } from "react";
import { clearHistory } from "../mood/history";

export function SettingsExtras() {
  const [cleared, setCleared] = useState(false);

  return (
    <button
      type="button"
      className="mood-clear-history"
      onClick={() => {
        clearHistory();
        setCleared(true);
      }}
    >
      {cleared ? "Local history cleared ✓" : "Clear local history"}
    </button>
  );
}
