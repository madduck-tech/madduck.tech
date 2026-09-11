---
layout: post
lang: en
translation_key: agentic-idp
title: "Agentic Development and IDPs: Why Platform Engineering Matters More"
description: "Autonomous coding agents need more than code generation: they need engineering context. An Internal Developer Portal can provide it."
deck: "Giving an autonomous agent repository access is not enough. It needs formal context for the entire engineering environment around that repository."
date: 2026-09-06 12:00:00 +0000
date_label: September 6, 2026
category: Platform Engineering
author: Mikhail Fufaev
categories:
  - platform-engineering
  - ai
  - architecture
tags:
  - idp
  - backstage
  - coding-agents
  - platform-engineering
permalink: /en/blog/agentic-idp/
alternate_url: /blog/agentic-idp/
image: /assets/images/posts/agentic-idp/cover.webp
image_alt: "A black agent duck walks from a chaotic collection of engineering systems through an IDP portal towards tests and a merge request"
---

Lately, I have been thinking a lot about what **agentic development inside a large company** should look like.

The most obvious scenario is already fairly clear. A task appears in Jira or YouTrack; an agent orchestrator picks it up, provisions an environment, hands the task to an agent, and the agent makes the changes, runs the tests, and opens a Merge Request.

In simplified form, it looks something like this:

```text
Tracker → Agent orchestrator → Repository → CI/CD → MR
```

This workflow is already technically feasible.

But the more I look at it, the more I think the hard part is not writing the code at all.

It lies between:

> **“receive a task” → “understand what needs to be done at all”**

## Code is not the main problem

Imagine an agent receives this task:

> Add a new validation when an order is created.

For someone on the team, that one sentence carries an enormous amount of implicit context.

The agent has to work out somehow:

* which service has to change;
* where its repository is;
* which system that service belongs to;
* what it depends on;
* who owns the component;
* how the service is built;
* how to run it locally;
* how it is deployed;
* which internal libraries are available;
* which architectural constraints apply;
* which security policies it must follow;
* where current documentation lives;
* which tests are mandatory;
* and what it is allowed to do automatically in the first place.

A developer already holds a substantial part of this knowledge in their head.

The rest is spread across several systems:

```text
GitLab / GitHub
Jira / YouTrack
Confluence / Wiki
Kubernetes
Terraform
CI/CD
Service Mesh
monitoring
internal instructions
the team chat
```

And, of course:

```text
Vasya's head
```

People are quite good at assembling that context from different sources.

For an autonomous agent, it becomes a separate engineering problem.

<aside class="article-callout" aria-label="Key idea">
  <p class="article-callout-label">Context is agent infrastructure</p>
  <p>Giving an agent access to a repository is not enough. It needs formalized context for the entire engineering environment around that repository.</p>
</aside>

## That is where an IDP comes in

This is why the connection between agentic development and an **IDP — Internal Developer Portal** feels so natural to me.

The architecture starts to look a little different:

```text
Tracker → Agent orchestrator → IDP → Agent → CI/CD → MR
```

In this model, an IDP is no longer just a polished portal where developers can browse a list of services.

It becomes a **single layer of engineering context**.

Through it, an agent can trace:

```text
task
  ↓
system
  ↓
component
  ↓
repository
  ↓
owner
  ↓
dependencies
  ↓
documentation
  ↓
policies
  ↓
available actions
```

Only after that does it move on to changing code.

## Backstage as a foundation

That is why I find [Backstage](https://backstage.io/) especially interesting.

It already provides much of the foundation this model needs:

* a catalog of services and components;
* relationships between entities;
* ownership;
* technical documentation;
* templates for creating components;
* CI/CD integrations;
* plugins that connect internal systems;
* a shared model of engineering entities.

Of course, Backstage by itself **is not an agent platform**.

It will not automatically take a Jira issue, write code, and open a Merge Request.

But it looks like a very good base on which to gradually build a complete **Agentic IDP**.

```text
                 ┌──────────────────────┐
                 │   Jira / YouTrack    │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Agent Orchestrator   │
                 └──────────┬───────────┘
                            │
                            ▼
              ┌────────────────────────────┐
              │            IDP             │
              │                            │
              │ Service Catalog            │
              │ Ownership                  │
              │ Dependencies               │
              │ Documentation              │
              │ Policies                   │
              │ Templates                  │
              │ Available Actions          │
              └─────────────┬──────────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │    Coding Agent      │
                 └──────────┬───────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
          Repository                  CI/CD
                │                       │
                └───────────┬───────────┘
                            ▼
                       Merge Request
```

## You do not need to build a perfect platform first

That does not mean a company has to spend years building the perfect Internal Developer Platform before it can launch its first agent.

You can start much more simply.

For example:

```text
task
  ↓
one known repository
  ↓
agent
  ↓
tests
  ↓
Merge Request
```

That is enough for early scenarios.

But then an interesting dependency emerges.

The more autonomy an agent receives, the more of its surroundings must be formalized.

At first:

```text
repository
```

Then:

```text
repository
+ build rules
+ tests
```

Later:

```text
+ dependencies
+ documentation
+ ownership
```

And then:

```text
+ architecture rules
+ security policies
+ infrastructure
+ deployment
+ observability
```

Gradually, the company discovers that it is no longer building just infrastructure for a coding agent.

It is building a **formal model of its engineering organization**.

<aside class="article-callout" aria-label="Key idea">
  <p>The more autonomy agents receive, the less a company can afford for its engineering environment to exist only as informal knowledge.</p>
</aside>

## Perhaps IDPs were built for the wrong user

Today, an Internal Developer Portal is usually seen as an interface for developers.

A developer goes there, finds a service, reads documentation, checks ownership, and starts a workflow.

But look a little further ahead and another user of the system appears:

**the agent**.

For an agent, that interface may prove even more important than it is for a person.

A person can:

* ask a colleague;
* find something in Slack;
* infer it from a repository name;
* inspect a neighbouring service;
* open Kubernetes and figure it out;
* do something “because that is how we have always done it.”

An agent is much better served by a formal answer:

```yaml
component: order-service

owner: team-commerce

repository:
  url: gitlab.company.local/commerce/order-service

depends_on:
  - payment-service
  - user-service

documentation:
  - architecture
  - api
  - runbook

deployment:
  type: kubernetes
  namespace: commerce

policies:
  - java-platform-policy
  - pci-security-policy

actions:
  - build
  - test
  - deploy-dev
  - run-integration-tests
```

An IDP like this is no longer so much a **portal** as an **API for the engineering organization**.

## People and agents will use the same layer

That leads to the most interesting thought for me.

**Agentic development and platform engineering will probably not just evolve in parallel — they will gradually converge into one system.**

The more engineering work a company wants to give to agents, the more it needs:

* a unified component catalog;
* formalized ownership;
* a dependency graph;
* machine-readable documentation;
* standardized processes;
* policies;
* APIs for engineering operations;
* controlled infrastructure access.

In other words, almost everything Platform Engineering has been working on for the past few years.

<aside class="article-callout" aria-label="Conclusion">
  <p class="article-callout-label">IDP for people → IDP for people and agents</p>
  <p>Perhaps the next iteration of an Internal Developer Platform will no longer be built as a portal that helps developers work with infrastructure. It will become a unified engineering platform through which both people and autonomous agents interact with the company.</p>
</aside>

In that world, the quality of an internal platform directly determines how autonomous your agents can be.
