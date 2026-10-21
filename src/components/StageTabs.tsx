"use client";

import { useState } from "react";

type Tab = { key: string; label: string; content: React.ReactNode };

/** Simple tabs for the stages of a groups + playoff tournament. */
export function StageTabs({ tabs, initial }: { tabs: Tab[]; initial: string }) {
  const [active, setActive] = useState(initial);
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium ${
              active === tab.key ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} role="tabpanel" hidden={active !== tab.key}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
