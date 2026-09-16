# AITrace

AITrace is a planned web application that helps faculty register AI use, assess governance risk and track follow-up actions across education, administration and research.

Developed for the **University of Canberra ICT Capstone Project 2026-S2R-04 — AI Governance Compliance Tracker**, sponsored by **Sri Ramakrishna Engineering College**.

## Project status

**Requirements review and planning.** Application implementation has not started, and there is no runnable application or installation command yet.

The proposal's 33 work breakdown structure (WBS) activities are recorded in [GitHub Issues](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues). These were imported as draft planning records. Suggested owners, estimates, acceptance criteria and dependencies require team review; they do not establish completed work or actual contributions.

Current work starts with [requirements and scope (#1)](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues/1). System design follows agreement on the requirements baseline.

## Intended workflow

1. **Register** an AI tool, system or use case and its purpose and data use.
2. **Classify** its use within education, administration or research.
3. **Assess** governance through a structured questionnaire.
4. **Understand risk** through an explainable, rules-based result.
5. **Take action** by tracking owners, due dates and progress.
6. **Monitor and report** through role-appropriate dashboards and exports.

The documented functional baseline includes authentication and role-based access, an AI registry, governance assessments, risk explanations, policy/evidence handling, action tracking, review reminders, dashboards, PDF/CSV reporting and Shadow AI self-reporting.

Exact roles, approval workflows, assessment questions, framework mappings, scoring thresholds and the meaning of “compliance status” remain subject to confirmation. The team will not invent governance rules to fill these gaps.

## Agreed technology direction

| Area | Decision |
| --- | --- |
| Frontend | React |
| Backend | Node.js |
| Integration | REST API |
| End-to-end testing | Playwright |
| Version control | Git and GitHub |
| Development and demonstration | Local deployment |
| Application structure | A simple modular monolith is preferred |
| Database | TBD |
| Authentication and authorisation implementation | TBD |
| File storage, dashboard libraries, reporting and reminders | TBD |

Unresolved technologies will be discussed before selection. Setup instructions will be added when the development foundation is implemented under [#10](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues/10).

## Team and collaboration

**Project team:** Jordon, Avnish, Ashvin and Noorpreet.  
**Sponsor contact:** Monisha.  
**Sponsor engagement:** Fortnightly meetings.

Use [repository issues](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues) to keep work visible:

- Confirm the actual assignee and readiness before starting. Proposal owners are suggestions until confirmed.
- Record progress, blockers, decisions and actual contributions on the relevant issue.
- Use **High / Medium / Low** priorities.
- Check blocking dependencies and retain unresolved sponsor decisions as TBD.
- Link commits, pull requests and test or review evidence to the issue.
- Review and verify acceptance criteria before closing work.

A GitHub Project has been created for the team. Its link and issue membership still need verification; repository issues provide the shared ticket references meanwhile.

The existing spreadsheet tickets map to GitHub as follows:

| Spreadsheet ticket | GitHub issue |
| --- | --- |
| TKT-001 — Define MVP scope | [#1](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues/1) |
| TKT-002 — AI system register | [#12](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues/12) |
| TKT-003 — Governance assessment | [#14](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues/14) |
| TKT-004 — Compliance dashboard | [#19](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues/19) |

## Documentation and delivery

Project source documents are maintained in the team's shared documentation workspace. The planning baseline includes the capstone requirements, project proposal and plan, ticket register, and Google Drive structure/workflow guide. Record sponsor decisions in meeting minutes and link the relevant evidence from issues.

Planned deliverables include the prototype, framework mapping, version-controlled source, setup and user guidance, testing evidence, a final demonstration and handover, and the sponsor-requested research paper. Research format and evaluation expectations remain subject to confirmation.

The WBS totals **368 estimated hours**, while the proposal's individual summaries total approximately **334 hours**. Reconciliation is tracked in [#2](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues/2).

## Scope and safeguards

This is a university capstone prototype. Development and demonstrations will use fictional, synthetic or appropriately de-identified data.

Out of scope:

- Production enterprise deployment and long-term operational support.
- Legal or regulatory certification, compliance sign-off and formal ISO certification.
- Automatic network/device monitoring or discovery of Shadow AI.
- Deepfake detection and AI-content forensics.
- Machine-learning-based compliance decisions.
- Real sensitive student, staff or research-participant data.
- Enterprise SSO and live institutional integrations unless subsequently approved.
- LLM-based compliance decisions or policy analysis unless separately approved.

Risk results support governance review and action tracking. They do not certify legal compliance.

## AI assistance

Generative AI supports planning, drafting and development. The project team remains responsible for reviewing, verifying and revising the work and accurately recording individual contributions. Assessment-specific University of Canberra AI-use requirements take precedence, and submission documents will include declarations where required.
