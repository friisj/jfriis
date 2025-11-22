# Experience Systems: Governance & SCP Workflow

**Gemini v3 — Detailed Governance Flow**

This document provides a detailed flowchart of the System Change Proposal (SCP) workflow, defining the process, roles, evidence, and decision gates for evolving an Experience System. It is a procedural deep-dive meant to complement the architectural ERDs and strategic roadmap.

---

## Core Principles of ES Governance

- **Safety and Coherence First**: The primary role of governance is to protect brand coherence and system integrity.
- **Traceability is Non-Negotiable**: Every change must be documented, reviewed, and linked to a clear rationale.
- **Automated Validation, Human Judgment**: Let machines handle objective checks (evals, tests). Let humans provide subjective, strategic approval.
- **Clarity of Roles**: Every step has a clear owner responsible for moving the proposal forward.

---

## Roles and Responsibilities

| Role | Responsibilities | Key Decisions |
| :--- | :--- | :--- |
| **Contributor** | Any team member proposing a change. Authors the SCP, provides required evidence, and revises based on feedback. | Submit for review, revise or abandon proposal. |
| **System Maintainer** | Technical owner(s). Ensures code quality, schema compliance, technical feasibility, and non-breaking changes. Merges approved proposals. | Approve/Reject on technical grounds. Request revisions. |
| **Brand Steward** | Creative owner(s). Ensures brand alignment, semantic coherence, and strategic fit. Final approver for changes impacting creative direction. | Approve/Reject on brand/strategic grounds. |
| **Evaluation Engine** | Automated CI/CD process. Runs all relevant tests and evaluations, calculates BCS, and attaches results as evidence. | Provides Pass/Fail signal for automated checks. |

---

## System Change Proposal (SCP) Workflow

This flowchart details the lifecycle of a single change proposal, from draft to deployment and monitoring.

```mermaid
flowchart TD
    subgraph Contributor
        A[1. Draft SCP] --> B{Ready for Review?};
        B -- No --> A;
        K[7b. Revise SCP based on feedback] --> B;
    end

    subgraph CI/CD Pipeline (Automated)
        C[3. Trigger Evals] --> D{Evals Pass & BCS ≥ Threshold?};
        D -- Yes --> E[4a. Attach Passing Report & Notify Reviewers];
        D -- No --> F[4b. Attach Failing Report & Notify Contributor];
    end

    subgraph Brand Steward (Creative Approval)
        G[5a. Review SCP & Eval Report] --> H{Brand/Strategic Approval?};
        H -- Reject --> J[6b. Add Rejection Rationale];
    end

    subgraph System Maintainer (Technical Approval)
        I[5b. Review SCP & Eval Report] --> L{Technical Approval?};
        L -- Reject --> J;
    end

    subgraph Final State
        M[7a. Merge & Deploy];
        N[7c. Close SCP (Rejected)];
    end

    B -- Yes --> C;
    F --> K;
    E --> G;
    E --> I;
    H -- Approve --> L;
    L -- Approve --> M;
    J --> K;

    classDef role fill:#ececff,stroke:#9370db,stroke-width:2px;
    classDef auto fill:#d4edda,stroke:#155724,stroke-width:2px;
    classDef decision fill:#fff3cd,stroke:#856404,stroke-width:2px;
    classDef final fill:#e2e3e5,stroke:#383d41,stroke-width:2px;

    class Contributor,Brand_Steward,System_Maintainer role;
    class CI/CD_Pipeline auto;
    class B,D,H,L decision;
    class M,N final;
```

### Workflow Steps Explained

1.  **Draft SCP (Contributor)**: A developer, designer, or brand manager identifies a needed change (e.g., a new rule, an adapter refinement, a seed value update). They create a new SCP using the `SCP-template.md`, providing a clear summary, rationale, and scope.
2.  **Submit for Review (Contributor)**: Once the SCP is ready, the contributor submits it (e.g., by creating a pull request in the ES package repository). This action formally triggers the governance workflow.
3.  **Trigger Evals (CI/CD Pipeline)**: The submission automatically triggers the Evaluation Engine. It runs all relevant automated checks:
    *   Schema validation and linting.
    *   Adapter snapshot tests.
    *   Derivation rule unit tests.
    *   Brand coherence evaluations (`evals.json`).
    *   BCS (Brand Coherence Score) calculation.
4.  **Automated Gate Check (CI/CD Pipeline)**:
    *   **If evals pass AND the calculated BCS is above the required threshold**, the results are attached to the SCP, and the Brand Steward and System Maintainer are notified to begin their manual review.
    *   **If any eval fails OR the BCS is below threshold**, the results are attached, the proposal is marked as "Changes Requested," and the contributor is notified to revise their work.
5.  **Manual Review (Brand Steward & System Maintainer)**: This happens in parallel.
    *   The **Brand Steward** reviews the proposal for strategic alignment and brand coherence. Their focus is on the "why" and the creative impact.
    *   The **System Maintainer** reviews the proposal for technical quality, schema correctness, performance, and maintainability. Their focus is on the "how" and the technical impact.
6.  **Approval Decision (Brand Steward & System Maintainer)**:
    *   **If both approve**, the SCP moves to the final merge step.
    *   **If either rejects**, they must add a clear, actionable rationale for the rejection to the SCP. The proposal is sent back to the contributor for revision.
7.  **Finalization**:
    *   **Merge & Deploy (System Maintainer)**: Upon receiving all approvals, the maintainer merges the change. The deployment pipeline automatically publishes the new version of the ES package.
    *   **Revise SCP (Contributor)**: The contributor uses the feedback to update their proposal and resubmits it for review, re-starting the automated evaluation process.
    *   **Close SCP (Contributor/Maintainer)**: If a proposal is rejected and will not be revised, it is formally closed and archived for historical record.

---
**Document Version**: Gemini v3
**Date**: 2025-11-22
**Purpose**: To provide a detailed, role-based procedural flowchart for ES governance, making the SCP workflow explicit and actionable.
**Related**: `claude-v3-erd.md`, `gemini-v2.md`