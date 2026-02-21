"use client";

import { Check, PenLine } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full items-center justify-center text-sm"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        <PenLine className="mr-2 h-4 w-4 animate-pulse" />
        Loading whiteboard…
      </div>
    ),
  },
);

export function ExcalidrawBoard({
  onSubmit,
  isSubmitted,
}: {
  onSubmit: () => void;
  isSubmitted: boolean;
}) {
  const [hasDrawn, setHasDrawn] = useState(false);

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Canvas fills all remaining space */}
      <div className="relative min-h-0 flex-1">
        <Excalidraw
          theme="dark"
          initialData={{
            appState: {
              viewBackgroundColor: "#16213e",
              currentItemFontFamily: 1,
            },
          }}
          onChange={(elements) => {
            if (elements.length > 0) setHasDrawn(true);
          }}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false,
            },
          }}
        />
      </div>

      {/* Footer bar */}
      <div
        className="flex shrink-0 items-center border-t px-6 py-4"
        style={{ borderColor: "rgba(244,114,182,0.18)", background: "#16213e" }}
      >
        {!isSubmitted ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!hasDrawn}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold transition-all hover:opacity-88 active:scale-[0.98] disabled:opacity-30"
            style={{ background: "#ffa025", color: "#070d06" }}
          >
            Submit Answer
          </button>
        ) : (
          <div
            className="flex items-center gap-3 rounded-xl px-5 py-3"
            style={{
              background: "rgba(28,72,21,0.35)",
              border: "1px solid rgba(28,72,21,0.7)",
            }}
          >
            <Check className="h-4 w-4" style={{ color: "#4ade80" }} />
            <span className="text-sm font-medium" style={{ color: "#4ade80" }}>
              Answer submitted
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
