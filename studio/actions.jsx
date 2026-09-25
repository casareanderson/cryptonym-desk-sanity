// Studio document actions for wordProposal: the same moves as the
// proposal-queue app, through the same rules (src/lib/proposals.js).
import {useState} from "react";
import {useClient, useCurrentUser} from "sanity";
import {Stack, Text, TextArea, Button, Flex} from "@sanity/ui";
import {TRANSITIONS, move, moveMutations, planMerge, mergeMutations, newKey} from "../src/lib/proposals.js";

const VERB = {in_review: "Start review", approved: "Approve", rejected: "Reject", merged: "Merge into word bank", proposed: "Reopen"};
const TONE = {approved: "positive", merged: "primary", rejected: "critical", in_review: "caution", proposed: "default"};

function makeAction(to) {
  function WorkflowAction({published, draft, onComplete}) {
    const client = useClient({apiVersion: "2025-02-19"});
    const user = useCurrentUser();
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const doc = published;
    const from = doc?.status ?? "proposed";
    if (!(TRANSITIONS[from] ?? []).includes(to)) return null;

    async function run() {
      setError("");
      try {
        const opts = {at: new Date().toISOString(), note: note.trim() || undefined, key: newKey(), by: user?.name};
        let muts;
        if (to === "merged") {
          const existing = await client.fetch(`*[_type == "wordBank" && bank == $bank]{_id, bank, value}`, {bank: doc.bank});
          muts = mergeMutations(doc, planMerge(doc, existing, opts));
        } else {
          muts = moveMutations(doc, move(doc, to, opts));
        }
        await client.mutate(muts, {visibility: "sync"});
        setOpen(false);
        setNote("");
        onComplete();
      } catch (e) {
        setError(e.message);
      }
    }

    return {
      label: VERB[to],
      tone: TONE[to],
      // The workflow patches the published document; an unpublished edit
      // would be silently left behind, so publish (or discard) it first.
      disabled: !doc || Boolean(draft),
      title: draft ? "Publish or discard your edits first" : undefined,
      onHandle: () => setOpen(true),
      dialog: open && {
        type: "dialog",
        header: `${VERB[to]}: ${doc.word}`,
        onClose: () => { setOpen(false); setError(""); },
        content: (
          <Stack space={3}>
            <Text size={1} muted>{from.replace("_", " ")} → {to.replace("_", " ")}</Text>
            <TextArea rows={3} value={note} placeholder={to === "rejected" ? "Reviewer note (required)" : "Reviewer note (optional)"}
              onChange={(e) => setNote(e.currentTarget.value)} />
            {error && <Text size={1} style={{color: "var(--card-badge-critical-dot-color, #c33)"}}>{error}</Text>}
            <Flex justify="flex-end"><Button tone={TONE[to]} text={VERB[to]} onClick={run} /></Flex>
          </Stack>
        ),
      },
    };
  }
  WorkflowAction.displayName = `Workflow_${to}`;
  return WorkflowAction;
}

export const workflowActions = ["in_review", "approved", "rejected", "merged", "proposed"].map(makeAction);
