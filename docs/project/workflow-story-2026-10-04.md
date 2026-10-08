# AITrace workflow story and improvement direction

AITrace should feel like a daily governance work queue rather than a form collection. The central story is:

1. **Discover** - someone registers or discloses an AI use, with owner, purpose, business area and data context.
2. **Understand** - a responsible reviewer starts an assessment, saves a draft while evidence is gathered, and sees related policy topics.
3. **Read and attest** - policy versions are attached to the assessment. The user reads the required material and records an acknowledgement before submission. Previously completed policy reads should be reusable where the policy version and user identity match.
4. **Decide** - the submitted assessment preserves the definition, answers, explanation and evidence that produced the synthetic result.
5. **Treat** - the manager turns findings into actions, with an owner, due date, evidence request and manual review where needed.
6. **Verify** - action completion records what happened; a bounded workflow may create the next review or evidence task.
7. **Learn** - Overview shows today?s work; Reports compares point-in-time snapshots or periods; configuration history explains why the process changed.

This follows the useful shape of NIST?s Govern, Map, Measure and Manage functions, while keeping the product?s CRM-like focus on owners, due dates, evidence and audit history. ISO/IEC 42001 similarly frames AI management as an organisation-wide system of policies, objectives and continual improvement. Comparable GRC products connect inventory, assessment, remediation and evidence rather than leaving them as separate portals.

## Product changes to prioritise

- Keep the workflow builder bounded: event, condition, action, assignee, due date, evidence requirement and manual-review gate. Do not add arbitrary scripts or an unrestricted state machine.
- Treat policy reading as a reusable user/version receipt. A new policy version requires a new read; a previously read unchanged version can be shown as already read. The UI should require the document to reach its end before enabling acknowledgement, while explaining that scrolling is an interaction check rather than proof of comprehension.
- Make the report period view compare start and end totals, status movements and newly overdue work.
- Keep the showcase narrative on the same sequence: register one fictional use, assess it, read one policy, submit, generate follow-up, complete evidence, then show the period report.

The bounded workflow builder now has a visual editor as well as assessment submission automation: administrators can drag approved functions from a library onto a workflow canvas, edit step names and descriptions, reorder steps with arrows or keyboard controls, mark evidence and manual-review gates, and version the result with the governance configuration. The server validates the graph, prevents cycles and unrestricted functions, and preserves the existing runtime controls and audit snapshots. The automation editor still lets administrators select the submission event, optionally match the synthetic result label, create one follow-up action, and set a due offset; each generated action stores the configuration version and automation rule id in its history.
