# AITrace walkthrough and workflow review — 2026-10-05

## Test approach

The documented story was exercised repeatedly through the application’s API and browser paths:

1. Register or disclose an AI use.
2. Create and save an assessment draft.
3. Open related policies.
4. Acknowledge required policy versions.
5. Submit the assessment.
6. Generate or assign follow-up actions.
7. Complete action work and inspect history.
8. Review the overview dashboard.
9. Compare point-in-time and period reports.
10. Review configuration, accounts, audit history, and the guide.

The checks were repeated through the complete Playwright suite and the registry API suite.

## Results

- Production build passed.
- Registry API suite: 34 passing tests.
- Full application suite: 34 registry API tests plus 51 configuration/domain tests, 85 passing tests total.
- Full Playwright suite: 29 passing tests.
- Diff check passed.
- Desktop and mobile navigation, account controls, themes, reports, registry, assessments, actions, policies, reminders, and workflow configuration remained usable through the tested paths.

## Sensibility review

The workflow is coherent for a small governance team:

- Registry is the starting system of record.
- Assessment drafts allow information gathering before submission.
- Policy links are explained by checklist topics.
- Submission produces a versioned decision record.
- Follow-up actions turn findings into assigned work.
- The overview page supports daily prioritisation.
- Reports support point-in-time and period review.
- Configuration and account controls are restricted to administrators or managers.
- Historical records retain the configuration and evidence that applied at the time.

The bounded workflow editor is a sensible limit for the current product. It supports useful automation without creating an unrestricted state-machine or scripting surface.

## Gap found

Policy acknowledgement is recorded correctly and submission is blocked when required acknowledgements are missing. The current UI does not yet:

- provide a dedicated organisation-level read/unread policy list;
- show a durable policy reading history outside the assessment context; or
- require the user to scroll to the end of a policy document before enabling acknowledgement.

These are UX and evidence improvements for the policy workflow. They should be implemented together because the read state, acknowledgement state, policy version, and user identity need to remain clear and consistent.

## Comparison with established workflow patterns

Current AI governance products consistently connect a central inventory to assessment, policy/control mapping, remediation, monitoring, and evidence. OneTrust describes an inventory as the system of record that supports ownership, lifecycle status, assessments, monitoring, and enforcement evidence ([AI Discovery and Registry](https://www.onetrust.com/solutions/ai-governance/ai-discovery-and-registry/)). Its broader AI governance workflow connects inventory, risk assessment, policy evaluation, remediation, runtime monitoring, and audit-ready evidence ([AI Governance](https://www.onetrust.com/solutions/ai-governance/)).

ServiceNow IRM describes a similar operational pattern: assessments identify issues, issues create remediation work, approvals are threshold-based, and evidence is gathered and retained with the workflow ([Integrated Risk Management data sheet](https://www.servicenow.com/content/dam/servicenow-assets/public/en-us/doc-type/resource-center/data-sheet/ds-Integrated-risk-management.pdf)). Its AI governance lifecycle also connects validation with attestations, issues, remediation evidence, exceptions, and reassessment triggers ([AI governance lifecycle](https://www.servicenow.com/docs/r/governance-risk-compliance/ai-risk-management/ai-gov-lifecycle.html)).

AITrace already follows the core pattern at an appropriately smaller scale: inventory → assessment → policy evidence → action → reporting. The main difference is that AITrace currently focuses on point-in-time governance records and manually entered evidence, while larger platforms add continuous runtime signals and automatic reassessment triggers. That larger scope is outside the current showcase workflow.

## Recommended next improvement

Implement the policy reading experience as one bounded improvement:

1. Add a policy read/unread view for each user, showing the current policy version and previous versions.
2. Open the policy in an in-app reader with an explicit “I have reached the end” state.
3. Enable acknowledgement only after the end-of-document state is reached.
4. Keep acknowledgement tied to the exact policy version, assessment, and account.
5. Surface the same evidence in the assessment and policy registry.

This preserves the current workflow while making the policy step easier to understand and stronger as an evidence trail.
