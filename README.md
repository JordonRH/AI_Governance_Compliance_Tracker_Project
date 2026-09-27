# AITrace

AITrace is a local web application prototype that helps Australian small and medium-sized enterprises register AI use, assess governance risk and track follow-up actions.

Developed for the **University of Canberra ICT Capstone Project 2026-S2R-04 — AI Governance Compliance Tracker**, sponsored by **Sri Ramakrishna Engineering College**.

## Project status

**Integrated capstone prototype, ready for review.** Registration/login, role controls, registry/disclosure, persisted demonstration assessments and explainable risk results, assigned actions, policy versions/reviews, in-app reminders, dashboard and PDF/CSV exports are implemented. Sponsor-approved assessment content and human acceptance remain pending. See the [user guide](docs/project/user-guide.md) and [acceptance checklist](docs/project/acceptance-checklist.md).

The proposal's 33 work breakdown structure (WBS) activities are recorded in [GitHub Issues](https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project/issues). These were imported as draft planning records. Suggested owners, estimates, acceptance criteria and dependencies require team review; they do not establish completed work or actual contributions.

Jordon reported requirements review complete and approved the initial stack on 20 September 2026. Jordon leads initial implementation; teammates will review later. See [requirements traceability](docs/project/capstone-requirements-traceability.md) for current scope and [development progress](docs/project/progress.md) for dated history.

## Start here

No AI service, API key, assistant, cloud database or Docker installation is needed to run this application. You need Git, Node.js **26.5 or later**, npm and a browser. Internet access is needed to install packages and the Playwright test browser.

Follow [Local setup and command reference](docs/project/development.md) from a fresh checkout. It includes cloning, dependency installation, first Administrator creation, starting/stopping the app, configuration and every npm command. Windows PowerShell examples use `npm.cmd` to avoid script-execution-policy issues; macOS/Linux equivalents are included.

A fresh checkout has **no default account or password**. The first-account step is required before signing in. Local data and certificate keys are never supplied by Git.

| Task | Instructions |
| --- | --- |
| Install and run AITrace | [Development runbook](docs/project/development.md) |
| Use each screen or demonstrate the app | [User guide](docs/project/user-guide.md) |
| Configure HTTPS, backups or account recovery | [Operations runbook](docs/project/operations.md) |
| Run tests and inspect results | [Verification](docs/project/development.md#verification) |
| Make a change and open a pull request | [Contributor workflow](docs/project/contributing.md) |
| Call the API or understand its permissions | [API reference](docs/project/api-reference.md) |
| Understand the modules and database | [Architecture](docs/project/architecture.md) |
| Review remaining requirements | [Traceability](docs/project/capstone-requirements-traceability.md) and [acceptance checklist](docs/project/acceptance-checklist.md) |

Default local URL: http://127.0.0.1:5173. The application only listens on this computer. A built instance uses `npm.cmd run build` then `npm.cmd start`; the `--production` flag selects built assets and does not establish production security approval.

## Intended workflow

1. **Register** an AI tool, system or use case and its purpose and data use.
2. **Describe** its business area, data sensitivity and approval state.
3. **Assess** governance through a structured questionnaire.
4. **Understand risk** through an explainable, rules-based result.
5. **Take action** by tracking owners, due dates and progress.
6. **Monitor and report** through role-appropriate dashboards and exports.

The documented functional baseline includes authentication and role-based access, an AI registry, governance assessments, risk explanations, policy/evidence handling, action tracking, review reminders, dashboards, PDF/CSV reporting and Shadow AI self-reporting.

The capstone baseline defines Administrator, Compliance Officer and Staff User roles. Their permission matrix, approval workflows, assessment questions, scoring thresholds and the meaning of "compliance status" require traceable decisions. The current prototype uses explicitly labelled synthetic questions/rules for demonstration; these do not resolve sponsor policy decisions.

## Agreed technology direction

| Area | Decision |
| --- | --- |
| Frontend | React with Vite |
| Backend | Node.js with Express |
| Integration | REST API |
| End-to-end testing | Playwright |
| Version control | Git and GitHub |
| Development and demonstration | Local deployment |
| Application structure | A simple modular monolith is preferred |
| Database | SQLite through the built-in Node.js SQLite module |
| Authentication and authorisation | Local accounts, scrypt passwords, opaque sessions and server-enforced permissions |
| File storage and delivery channels | Versioned SQLite policy blobs and scheduled in-app notifications |

Governance content review remains open. The app is an authenticated local prototype; optional TLS and storage-encryption acceptance are documented in the [security plan](docs/project/security-configuration.md). Read the [documentation index](docs/README.md), [local development](docs/project/development.md), [architecture](docs/project/architecture.md) and [progress](docs/project/progress.md) before extending it.

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

Original project source documents are preserved in [`docs/source-materials/`](docs/source-materials/). The planning baseline includes the capstone requirements, project proposal and plan, ticket register, and Google Drive structure/workflow guide. Record sponsor decisions in meeting minutes and link the relevant evidence from issues.

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
- Real client, employee or third-party personal information.
- Enterprise SSO and live institutional integrations unless subsequently approved.
- LLM-based compliance decisions or policy analysis unless separately approved.

Risk results support governance review and action tracking. They do not certify legal compliance.

## AI assistance

Generative AI supports planning, drafting and development. The project team remains responsible for reviewing, verifying and revising the work and accurately recording individual contributions. Assessment-specific University of Canberra AI-use requirements take precedence, and submission documents will include declarations where required.
