# Assessment 3A: Deliverable and process report

**Project:** AITrace — AI Governance Compliance Tracker<br>
**Capstone:** University of Canberra ICT Capstone Project 2026-S2R-04<br>
**Sponsor:** Sri Ramakrishna Engineering College (SREC)<br>
**Team:** Jordon, Avnish, Ashvin and Noorpreet<br>
**Status:** Draft prepared before the assessment-specific requirements are released<br>
**Report date:** 28 September 2026

> **Submission note:** This is a requirements-neutral draft. Before submission, apply the required word count, template, referencing style, individual-contribution declaration, AI-use declaration and any marking-rubric wording supplied for Assessment 3A. Do not infer individual contributions from the current speaker order or planning records; confirm them with the team.

## Executive summary

AITrace is a local web-application prototype that helps Australian small and medium-sized enterprises (SMEs) make their use of artificial intelligence visible and governable. The project responds to a practical problem: AI tools can be adopted informally, leaving uncertainty about their business purpose, ownership, data sensitivity, approval state and required follow-up. AITrace brings those activities into one workflow: register or disclose an AI use, assess it using a structured questionnaire, view an explainable demonstration risk result, assign actions, retain policy/evidence records, receive reminders and produce summaries.

The delivered prototype is designed for three roles—Administrator, Compliance Officer and Staff User—and uses a local React/Vite frontend, Node.js/Express backend and SQLite database. The team adopted an incremental, evidence-led development process. Planning and research first established a governance and security direction without presenting external frameworks as approved project policy. Implementation then proceeded through small, traceable delivery batches, each supported by automated tests, documentation and issue tracking.

The current prototype is ready for a fictional-data sponsor demonstration. It is not presented as a production deployment, legal-compliance certification or sponsor-approved governance framework. Sponsor approval of assessment questions and thresholds, representative human usability/accessibility testing, independent operational/security review, trusted TLS and encrypted-storage evidence, and final handover remain outstanding. This distinction is central to the project’s responsible delivery approach.

## 1. Project context and problem

Australian SMEs may benefit from AI tools for writing, analysis, customer communication and everyday operations. Yet informal adoption can create a governance gap. A manager may not know which tool is in use, which business activity it supports, who is accountable, whether sensitive information is involved, or whether an identified concern has been addressed. A spreadsheet or isolated conversation can record part of that story, but it does not provide a connected, role-appropriate process for registration, assessment, evidence and follow-up.

AITrace was conceived as a local prototype for making this information visible before it becomes a blind spot. Its intended audience is nontechnical business, compliance and administrative users in Australian SMEs. The project deliberately limits its claims: deterministic results support governance review and action tracking, but they do not certify legal compliance. The prototype also uses fictional, synthetic or appropriately de-identified demonstration data.

## 2. Deliverable overview

The primary deliverable is an integrated local web application. Its intended workflow is shown below.

1. A user registers an approved AI tool or use case with its purpose, owner, business area, data sensitivity and approval state.
2. A staff member can disclose an unregistered AI use for review, supporting a voluntary Shadow AI reporting path.
3. An authorised user completes a structured governance assessment and receives a stored, explainable demonstration result.
4. A Compliance Officer creates and tracks linked follow-up actions with owners, due dates and history.
5. The organisation retains versioned policy/evidence records, schedules reviews and receives in-app reminders.
6. Users monitor relevant information through dashboards and export PDF or CSV summaries.

The prototype implements role-based access, organisation-scoped data separation, local authentication, audit-oriented account controls, a registry, disclosure queue, assessment lifecycle, explainable deterministic scoring, action tracking, versioned policies, reminders, dashboards and reporting. It also includes responsive layouts, two visual palettes, keyboard-focused interaction and automated accessibility scans.

The project provides supporting delivery materials: local setup instructions, a user guide, API reference, architecture overview, operations and security guidance, contributor workflow, acceptance checklist, research notes, a screenshot showcase and a sponsor-facing PDF. Together, these materials make the prototype reviewable from a clean checkout and give stakeholders a controlled demonstration path.

## 3. Approach and process

### 3.1 Scope and evidence boundaries

The team used the capstone baseline as the product scope and recorded requirements through a traceability document and GitHub issues. A key process decision was to separate three kinds of evidence:

- **Implemented evidence:** functionality that can be demonstrated in the local prototype and verified with automated checks.
- **Human or sponsor acceptance:** usability, accessibility, policy and workflow decisions that require the relevant people to perform and record a review.
- **Operational readiness:** trusted TLS, encrypted storage, independent review and deployment decisions that cannot be established solely by local prototype tests.

This separation avoided presenting synthetic assessment content as sponsor-approved policy or treating automated tests as human acceptance. It also kept open work visible rather than prematurely closing it.

### 3.2 Research and design

Early work reviewed governance-framework candidates and relevant privacy and security guidance at a topic level. The research was used to identify design questions—such as accountability, transparency, human oversight, data handling, evidence and review—not to copy a framework into the product as a compliance claim. The design retained a clear seam between approved questionnaire content and the deterministic scoring engine so sponsor-approved definitions can replace the current demonstration content later.

The technical design selected a modular monolith: React with Vite for the client, Node.js with Express for the API, REST integration and SQLite for local persistence. This choice supported a manageable capstone scope, local demonstration and traceable workflow without requiring cloud infrastructure or external AI services.

### 3.3 Incremental implementation

Implementation progressed in ordered batches. The early batches established the data model, secure local accounts and permissions. Later batches integrated the assessment lifecycle, explainable result, actions, policies, reminders, exports and connected dashboard. Subsequent work strengthened password handling, throttling, account auditing, optional certificate administration, accessibility checks and delivery documentation.

Each batch was linked to Git history and project tickets. The delivery record preserves what was delivered, the related tickets and the remaining acceptance work. This created a practical audit trail and allowed the prototype to become demonstrable without concealing unresolved sponsor decisions.

### 3.4 Verification and quality assurance

The project used disposable SQLite fixtures for application tests and a separate temporary environment for browser tests, avoiding mutation of the normal local demonstration database. Current automated verification records **68 application tests** and **23 browser tests** passing. Coverage includes role and organisation boundaries, account lifecycle, registry and disclosure workflows, assessment revisions and immutable results, action ownership/history, policy validation and downloads, reminders, reporting and key browser interactions.

The browser suite also exercises responsive desktop, tablet and mobile layouts, both visual palettes and light/dark modes, required-field errors and automated accessibility scans. A production build and dependency audit have also passed. For reporting, PDF output was rendered and visually inspected for page breaks, wrapping, margins, page numbering and common accented Latin characters. A 500-record registry/CSV check provides a demonstration-scale performance regression threshold; it is not a claim of large-scale performance testing.

## 4. Outcomes and value

AITrace’s value is the connected governance record. Instead of treating registration, assessment and remediation as separate tasks, the prototype links them so an organisation can move from “we have an AI tool” to “we know its context, review result, accountable owner and required follow-up.” The dashboard and exports make that information easier to inspect, while the disclosure route recognises that staff may encounter AI use outside a formal register.

The design also supports feasibility for a capstone demonstration. It runs locally without an AI service, API key, cloud database or Docker requirement. Its deterministic risk demonstration is explainable and versioned, allowing a reviewer to see why a result was produced. Role and organisation scoping, sessions, password hashing, safe errors and upload limits establish a realistic baseline for a local prototype without overstating its operational maturity.

The sponsor showcase and acceptance checklist give the group a repeatable way to demonstrate the end-to-end workflow using fictional data. They support a forthcoming sponsor session while maintaining a record of decisions, observations and follow-up tickets.

## 5. Reflection and lessons learned

The project demonstrated that AI governance is not solved by a single score. A useful workflow needs understandable language, clear ownership, visible evidence and a process that users can follow. The team also learned to preserve uncertainty explicitly: assessment questions, risk thresholds and workflow policy should be agreed with the sponsor rather than invented to make a prototype appear complete.

From an engineering perspective, the project reinforced the value of separating stable workflow capabilities from decision-gated content. The application can preserve assessment versions, calculate a deterministic result and show its explanation while leaving the actual questions and rules open to sponsor approval. Testing separate data stores and using fictional fixtures also supported repeatable verification without affecting demonstration data.

The remaining assessment reflection should be completed collaboratively before submission. The final version should state each member’s actual responsibilities, contributions, review activity and learning, based on records the team agrees are accurate. It should not rely on proposal-assigned owners or on automated-assistant activity as evidence of a person’s contribution.

## 6. Limitations and further work

The following work remains necessary before any broader operational use:

- Demonstrate the integrated prototype to the sponsor and record feedback, decisions and follow-up work.
- Obtain sponsor approval for assessment questions, rules, thresholds, terminology and framework interpretation.
- Conduct representative SME usability, keyboard and screen-reader UAT, with named reviewers and recorded outcomes.
- Complete an independent clean-checkout and security review.
- Establish and verify trusted TLS and encrypted storage in the intended operating environment.
- Agree retention, deletion, notification and policy-file handling requirements.
- Complete the sponsor-requested research paper, final team reflection and formal handover.

These are not minor caveats. They define the boundary between a reviewable capstone prototype and a sponsor-accepted or production-ready system.

## 7. Conclusion

AITrace delivers a working local prototype for a connected SME AI-governance workflow. It makes AI use more visible through registration and disclosure, supports structured assessment and explainable demonstration outcomes, and connects those outcomes to actions, evidence, reminders and reports. The development process used traceability, incremental delivery, automated verification and clear evidence boundaries to produce a credible demonstration artifact while keeping unresolved decisions open.

The next phase is to validate the prototype with the sponsor and representative users, then use that evidence to refine both the deliverable and the final capstone submission.

## References and project evidence

Apply the required academic citation style when the assessment brief is released. The following repository evidence supports this draft:

- [Project overview](../../README.md)
- [Requirements traceability](capstone-requirements-traceability.md)
- [Ordered delivery record](capstone-delivery-2026-09-26.md)
- [Acceptance checklist](acceptance-checklist.md)
- [Development and verification guide](development.md)
- [User guide](user-guide.md)
- [Architecture](architecture.md)
- [Security configuration](security-configuration.md)
- [Background and literature review](../research/background-and-literature-review.md)
- [Governance-framework candidate map](../research/governance-framework-candidate-map.md)
- [Sponsor showcase PDF](../../output/pdf/aitrace-sponsor-showcase.pdf)

## Submission completion checklist

- [ ] Replace the report date and add the required submission details.
- [ ] Apply the final Assessment 3A word count, section headings and rubric.
- [ ] Add required academic references and check all factual claims against the final prototype state.
- [ ] Insert 2–4 labelled figures from the fictional-data showcase, with captions and alt text if required.
- [ ] Complete the factual, team-agreed contribution and reflection statement.
- [ ] Add the required University of Canberra AI-use declaration.
- [ ] Update pending-work wording after the sponsor demonstration and any UAT.
