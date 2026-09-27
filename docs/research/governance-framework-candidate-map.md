# Candidate AI governance framework map

Current context (27 September 2026): this candidate research preserves the earlier higher-education proposal framing. The running capstone prototype uses an SME baseline; see [requirements traceability](../project/capstone-requirements-traceability.md). This is neither sponsor approval nor the final research paper. Citations retain their original research date and have not been newly revalidated in this documentation-only review.

Status: Topic-level candidate map for team and sponsor review
Prepared: 20 September 2026
Scope: Research output for GitHub issue #4; not an assessment questionnaire, scoring model, policy, certification claim or legal opinion.

## Mapping method

This map compares the public source material named in the project proposal and adds higher-education context. It identifies common governance topics that could later support traceable assessment design. It deliberately stops before questions, response options, weights, thresholds and approval rules.

| Candidate topic | NIST AI RMF 1.0 | Australia's AI Ethics Principles | ISO/IEC 42001 public overview | OAIC AI privacy guidance | Higher-education context | Candidate AITrace evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Governance and accountability | GOVERN is cross-cutting across AI risk activity | Accountability; human-centred values | Establish and maintain an organisational AI management system | Identify organisational responsibility and conduct product due diligence | Multi-stakeholder governance and clear institutional responsibilities | Named owner; accountable unit; reviewer and decision records after roles are approved |
| Intended purpose and context | MAP establishes context, intended use, impacts and affected stakeholders | Human, societal and environmental wellbeing; human-centred values | Manage AI risks and opportunities in organisational context | Assess suitability for intended uses | Distinguish education, administration and research purposes | Purpose; category; affected groups; expected benefit; prohibited/out-of-scope uses |
| Human oversight and agency | MAP includes defined human oversight aligned with policy | Human-centred values; accountability | Responsible use within managed processes | Consider how human oversight is embedded | Protect learner, staff and researcher agency; preserve human academic and institutional judgement | Human decision point; override/escalation path; responsible operator |
| Fairness, inclusion and accessibility | MAP and MEASURE support impact and trustworthiness evaluation | Fairness; human-centred values | Ethical and responsible management | Consider adverse impacts and information handling | Equity, accessibility, diverse cohorts and digital divides | Affected cohorts; accessibility review; identified disparate-impact concerns |
| Privacy, data and security | GOVERN, MAP, MEASURE and MANAGE address risk throughout the lifecycle | Privacy protection and security | Risk management, traceability and reliability | Privacy obligations can cover AI inputs and outputs; due diligence and APP considerations | Student, staff, research-participant and confidential institutional data | Data description; personal/sensitive/confidential-data indicators; provider access; retention/location subject to policy |
| Reliability, safety and evaluation | MEASURE evaluates risks; MANAGE prioritises and treats them | Reliability and safety | Manage risks and opportunities; continual improvement | Confirm product suitability and relevant testing | Accuracy, hallucination and fitness for educational, administrative or research purpose | Test evidence; known limits; failure modes; fallback; review date |
| Transparency and disclosure | Documentation and communication appear across the Core | Transparency and explainability | Traceability and transparency | Clear privacy notices and transparent AI use | Disclosure to learners, staff, research participants and decision subjects | User notice; disclosure requirement; plain-language explanation; source/version record |
| Contestability and remediation | MANAGE includes response, recovery and communication | Contestability; accountability | Managed corrective and improvement processes | Access/correction and complaint considerations depend on applicable privacy obligations | Appeals, academic processes and correction of institutional decisions | Challenge/contact path; incident/action record; outcome and closure evidence |
| Monitoring and change | Risk management is continuous across the lifecycle | Lifecycle monitoring and ongoing risk management | Plan-Do-Check-Act continual improvement | Reassess privacy/security and product suitability as use changes | Tools, models, policies, assessments and institutional practices change | Last review; next review; material-change trigger; version history |

## Source roles and boundaries

### NIST AI RMF 1.0

Use as a flexible risk-management structure organised around GOVERN, MAP, MEASURE and MANAGE. NIST describes it as voluntary, rights-preserving, non-sector-specific and use-case agnostic. NIST also states that version 1.0 is being revised. AITrace should store the exact source/version used by any future rule set.

### Australia's AI Ethics Principles

Use as a plain-language values baseline spanning wellbeing, human-centred values, fairness, privacy/security, reliability/safety, transparency/explainability, contestability and accountability. The principles do not themselves define the institution's approval workflow or a numerical scoring system.

### ISO/IEC 42001:2023

Use as a candidate organisational management-system reference for governance, risk/opportunity management, traceability and continual improvement. This map relies only on ISO's public overview. AITrace must not claim clause-level alignment, implementation or certification without authorised access and competent review of the full standard.

### OAIC guidance

Use to identify candidate privacy due-diligence and information-handling topics for commercially available AI products. The OAIC says its AI guidance is not comprehensive and must be considered with the Privacy Act 1988 and Australian Privacy Principles where they apply. AITrace cannot determine legal applicability.

### Higher-education sources

Use UNESCO and TEQSA to adapt general governance topics to teaching, learning, assessment and research. Use peer-reviewed higher-education reviews to identify institutional, stakeholder and socio-technical considerations. Institutional policy remains the controlling local input once supplied and approved.

## Proposed traceability structure

A future assessment definition should keep these elements separate and versioned:

- source document and version;
- source provision or topic identifier;
- institution-approved interpretation;
- assessment question and help text;
- permitted responses;
- deterministic rule and explanation;
- evidence expected;
- responsible reviewer;
- effective date and superseded version.

This structure permits an explanation to identify why a result occurred without claiming that the software itself determines legal compliance.

## Decisions required before questionnaire design

1. Which framework or combination is approved as the assessment basis?
2. Which institutional policies apply to education, administration and research?
3. Which user roles submit, review, approve and appeal?
4. What does each proposed status mean, and how is risk kept separate from approval and compliance?
5. Which questions are mandatory in each context?
6. Which evidence is required, and who may access it?
7. Which deterministic rules and thresholds are approved?
8. How are framework/rule versions changed and existing assessments re-evaluated?

Until these decisions are recorded, every registry record remains **Not assessed**.

## References

- [NIST AI RMF 1.0](https://doi.org/10.6028/NIST.AI.100-1)
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [Australia's AI Ethics Principles](https://www.industry.gov.au/publications/australias-ai-ethics-principles)
- [ISO/IEC 42001:2023 public overview](https://www.iso.org/standard/42001)
- [OAIC guidance on commercially available AI products](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products)
- [UNESCO guidance for generative AI in education and research](https://unesdoc.unesco.org/ark:/48223/pf0000386693)
- [TEQSA assessment-reform guidance](https://www.teqsa.gov.au/guides-resources/resources/corporate-publications/enacting-assessment-reform-time-artificial-intelligence)
- [Barus et al. higher-education governance review](https://doi.org/10.1080/10494820.2025.2596058)
- [Jiang and Abdullah higher-education governance review](https://doi.org/10.3389/feduc.2026.1856440)

All web sources were checked on 20 September 2026.
