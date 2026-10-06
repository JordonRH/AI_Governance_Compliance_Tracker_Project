# AITrace AI-use governance story

This document describes the intended end-to-end user journey after an organisation declares an AI use in AITrace.

## 1. Declare the AI use in Registry

The user records:

- AI use name
- Owner
- Business area
- Purpose
- Data description
- Data sensitivity
- Approval status

The record is saved in the organisation registry. The former standalone “Disclose AI use” page is part of Registry.

## 2. Create an assessment

The user opens the AI use and selects **Create assessment**.

AITrace creates a draft from the currently active, versioned assessment definition. Questions can depend on the AI use’s business area.

The draft can be saved and completed later. Historical assessments retain the definition that was active when they were created.

## 3. Review linked policies

Policies are linked to assessments through their checklist topics.

When an assessment requires a policy:

- The policy appears in the assessment.
- The user opens and reviews the policy.
- The user explicitly acknowledges the exact policy version.
- The acknowledgement is recorded against the user and assessment.

A policy version that has already been acknowledged does not need to be acknowledged again for that same version.

## 4. Submit the assessment

The user answers all required questions and submits the assessment.

AITrace records:

- Result and outcome
- Findings
- Responses
- Assessment definition version
- Policy acknowledgement evidence
- Submission timestamp

Submitted assessments are immutable. Later configuration changes do not rewrite historical results.

## 5. Generate follow-up work

A configured administrator automation rule can respond to the submission event.

Example:

> When an assessment is submitted, create a “Review evidence pack” action due in 14 days.

The generated action includes:

- Linked AI use
- Linked assessment
- Owner
- Due date
- Automation rule ID
- Workflow configuration version
- Action history

The workflow editor is intentionally bounded. It supports controlled events, conditions, actions, due dates, and history instead of arbitrary scripts or an unrestricted workflow builder.

## 6. Manager or administrator review

A manager or administrator reviews:

- Assessment outcome
- Findings
- Related policies
- Linked actions
- Evidence and history

They can create or adjust actions when manual review is needed.

## 7. Complete the actions

Action owners see outstanding work on the dashboard and action register.

Actions move through:

- Not Started
- In Progress
- Complete

Changes are versioned in the action history.

## 8. Monitor the overview dashboard

The front page provides the daily operational view:

- Draft assessments
- Open actions
- Due and overdue work
- Upcoming dates
- AI use counts
- Assessment status counts
- Business-area percentages

This is the CRM-like working screen for deciding what needs attention today.

## 9. Use reports for point-in-time or period analysis

Reports can be viewed:

- As of a selected date
- Between a From date and To date
- Across several report types
- As charts or tables
- Filtered into underlying records
- Exported to CSV or PDF

This answers questions such as:

- How many AI uses were registered at that time?
- How many assessments were drafts, submitted, or missing?
- How many actions were open or overdue?
- Which business areas have the most AI use?
- What changed between two dates?

## 10. Maintain the governance record

Administrators manage:

- Versioned assessment requirements
- User capabilities
- Bounded custom roles
- Workflow settings
- Policy versions
- Audit history

Access changes revoke affected sessions, and historical assessments and actions preserve the configuration and evidence that applied at the time.

## Intended story

**Discover → Assess → Read and acknowledge → Decide → Create actions → Complete actions → Report and improve.**

The system is designed as a practical daily governance workflow: a declaration creates a traceable record, an assessment creates a decision, a decision creates accountable work, and completed work becomes evidence for reporting and future improvement.
