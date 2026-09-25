import {useState} from "react";
import {useClient, useCurrentUser, useQuery} from "@sanity/sdk-react";
import {
  STATUSES, TRANSITIONS, move, moveMutations, planMerge, mergeMutations, newKey, normalise, problems,
} from "../../src/lib/proposals.js";

// Live: useQuery re-runs when any matching document changes, so a move made by
// another reviewer (or the script, or the Studio) shows up without a reload.
const QUERY = `*[_type == "wordProposal"] | order(_createdAt asc) {
  _id, _rev, _createdAt, word, bank, weight, rationale, proposedBy, status, reviewerNote,
  "mergedAs": mergedAs._ref, history
}`;

const LABEL = {proposed: "Proposed", in_review: "In review", approved: "Approved", rejected: "Rejected", merged: "Merged"};
const VERB = {in_review: "Start review", approved: "Approve", rejected: "Reject", merged: "Merge into bank", proposed: "Reopen"};

export function Queue() {
  const {data, isPending} = useQuery({query: QUERY});
  const user = useCurrentUser();
  const client = useClient({apiVersion: "2025-02-19"});
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, []]));
  for (const p of data ?? []) byStatus[p.status ?? "proposed"]?.push(p);

  return (
    <div className="queue">
      <header className="mast">
        <div>
          <h1>Word proposals <em>review queue</em></h1>
          <p className="sub">Every card is a <code>wordProposal</code> document in <code>en9phc0q/production</code>.
            Its status and history are fields on the document — moving a card is a patch, and a merge writes the{" "}
            <code>wordBank</code> entry the site builds from.</p>
        </div>
        <div className="who">{isPending ? "syncing…" : "live"} · {user?.name ?? "signed in"}</div>
      </header>
      <div className="lanes">
        {STATUSES.map((s) => (
          <section key={s} className={`lane lane-${s}`}>
            <h2>{LABEL[s]} <span>{byStatus[s].length}</span></h2>
            {byStatus[s].map((p) => <Card key={p._id} p={p} client={client} by={user?.name} />)}
          </section>
        ))}
      </div>
    </div>
  );
}

function Card({p, client, by}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = p.status ?? "proposed";
  const last = (p.history ?? []).at(-1);
  const issues = problems(p);

  async function go(to) {
    setBusy(true);
    setError("");
    try {
      const opts = {at: new Date().toISOString(), note: note.trim() || undefined, key: newKey(), by};
      let muts;
      if (to === "merged") {
        // Read the bank fresh at merge time: the duplicate check must see what
        // is in the dataset now, not what the queue last rendered.
        const existing = await client.fetch(`*[_type == "wordBank" && bank == $bank]{_id, bank, value}`, {bank: p.bank});
        muts = mergeMutations(p, planMerge(p, existing, opts));
      } else {
        muts = moveMutations(p, move(p, to, opts));
      }
      await client.mutate(muts, {visibility: "sync"});
      setNote("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card">
      <div className="word">{normalise(p.bank, p.word)}</div>
      <div className="meta">{p.bank} · ×{p.weight ?? 1}{p.proposedBy ? ` · from ${p.proposedBy}` : ""}</div>
      <p className="why">{p.rationale}</p>
      {p.reviewerNote && <p className="note">Reviewer: {p.reviewerNote}</p>}
      {p.mergedAs && <p className="merged">→ <code>{p.mergedAs}</code></p>}
      {last && <p className="last">{LABEL[last.status]} {new Date(last.at).toISOString().slice(0, 16).replace("T", " ")} UTC{last.by ? ` · ${last.by}` : ""}</p>}
      {issues.length > 0 && <p className="err">{issues.join("; ")}</p>}
      {TRANSITIONS[status].length > 0 && (
        <>
          {status !== "approved" && (
            <textarea placeholder={TRANSITIONS[status].includes("rejected") ? "Reviewer note (needed to reject)" : "Reviewer note"} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          )}
          <div className="actions">
            {TRANSITIONS[status].map((to) => (
              <button key={to} className={`b-${to}`} disabled={busy} onClick={() => go(to)}>
                {status === "approved" && to === "in_review" ? "Send back" : VERB[to]}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <p className="err">{error}</p>}
    </article>
  );
}
