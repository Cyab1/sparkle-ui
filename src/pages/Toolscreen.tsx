import { TOOL_PAGES } from "@/components/layout/Layout";
import { PageTitle } from "@/components/shared/PageTitle";

interface ToolsScreenProps {
  setPage: (page: string) => void;
}

export function ToolsScreen({ setPage }: ToolsScreenProps) {
  return (
    <div className="max-w-[1060px] mx-auto px-4 pt-6 pb-8">
      <PageTitle sub="AI-powered tools to support your training">
        Tools & <span className="text-primary">Fitness</span>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3">
        {TOOL_PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPage(p.id)}
            // ✅ White card style — matches the rest of the app's button aesthetic
            className="bg-card border border-border rounded-xl p-4 font-body font-bold text-sm text-foreground cursor-pointer text-left transition-all active:scale-95 hover:border-primary/40 hover:bg-secondary"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}