import { Link } from "react-router-dom";
import { AppShell, Panel } from "../components/AppShell";

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <AppShell title={title}>
      <Panel className="p-10 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-canvas text-xl font-black text-muted">
          K9
        </div>
        <p className="mt-4 text-sm font-extrabold">{title} — coming in the next phase</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
          The K9 Roster phase is live now. Other modules will follow the same pattern.
        </p>
        <Link
          to="/k9-roster"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-xs font-bold text-white"
        >
          Go to K9 Roster
        </Link>
      </Panel>
    </AppShell>
  );
}
