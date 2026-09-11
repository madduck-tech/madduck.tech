---
lang: en
translation_key: konstruktor
title: 'Konstruktor: when writing code is not enough'
description: 'How Konstruktor turns a coding-agent task into a specification, plan, verifiable result, and report.'
deck: 'An autonomous agent that tries to do more than follow a prompt: it turns a task into a verifiable result.'
date: 2026-09-11 10:00:00 +0000
date_label: September 11, 2026
category: Tools
permalink: /en/blog/konstruktor/
alternate_url: /blog/konstruktor/
image: /assets/images/konstruktor-hero.webp
image_alt: "Konstruktor poster: an engineering duck in a hard hat at a large construction site"
image_caption: Before building, you need to know exactly what the result should be.
---
Modern coding agents are already fairly good at writing code.

Give one a task:

> Add email validation to the signup form.

The agent opens the project, reads files, changes something, runs tests, and eventually reports: **Done.**

That is where things get interesting.

Because “Done” does not necessarily mean the task is actually done.

The agent may have missed a scenario, changed adjacent behaviour, left out part of the requirements, written tests that prove the wrong thing, or simply solved the problem differently from what you had in mind.

The more complex the task, the sharper this problem becomes. At some point, it becomes clear that one more good prompt will not solve it.

You need a process.

## From prompt to engineering process

That is the idea behind **Konstruktor**.

Konstruktor is a small open-source tool built on OpenHands for running coding tasks without interactive human involvement. The interesting part of the project is not the agent launch itself, though.

The main idea is to make the agent pass through several distinct stages of work rather than one long conversation:

```text
task
  ↓
intent
  ↓
specification
  ↓
specification review
  ↓
implementation plan
  ↓
code
  ↓
requirements verification
  ↓
fixes
  ↓
re-verification
  ↓
report
```

Instead of this:

```text
PROMPT → AGENT → CODE
```

you get this:

```text
PROBLEM → SPEC → PLAN → BUILD → VERIFY → FIX → VERIFY
```

The difference looks small. In practice, it changes almost everything.

## First, agree on what “done” means

One problem with working with LLMs is that the original task is usually too ambiguous.

For example:

```text
Add email validation.
```

What does that mean?

Should it only look for an `@`? Use an RFC-compatible validator? Check email only on the frontend or on the backend too? What should the API return? Do existing tests need changing? What should happen to existing users?

A person usually clarifies these things as the work goes on. An autonomous agent has to make assumptions.

So in `plan` mode, Konstruktor first turns the original task into a specification: numbered requirements, acceptance criteria, and a clear list of what is **out of scope**. The specification is then checked separately and revised if necessary.

That gives us something important: **the code is no longer the only description of what the agent decided to do.**

Before implementation starts, there is a document that the eventual result can be checked against.

## The plan is an artifact too

The next step is an implementation plan. Not an abstract “I will study the code and make changes,” but a plan at the level of files and concrete edits.

After the task is complete, the project retains a set of documents:

```text
docs/specs/<task>/

intent.md
spec.md
plan.md
compliance.md
report.md
```

This is one of the most important parts to me.

When an ordinary agent finishes its work, you are often left with only a Git diff and a long trail of its reasoning. Konstruktor tries to leave an **engineering trail**:

- what we wanted to do;
- which requirements we formulated;
- how we planned to implement them;
- what the delivered result satisfies;
- which requirements remain unmet;
- what happened in the end.

Even when the agent makes a mistake, it becomes much easier to find **where exactly it went wrong**.

## The most important stage is not generation

The key part begins after the code has been written.

Konstruktor runs a separate verification stage. Each specification item is compared with the actual result, then turned into a compliance matrix.

For example:

```text
REQ-001    PASS
REQ-002    PASS
REQ-003    FAIL
REQ-004    PASS
```

When something fails verification, the agent is not told to “look at everything again and fix it.” It gets a much narrower task: fix only the requirements that did not pass.

Verification then runs again. The number of cycles is limited by configuration, so the process should not try to repair itself forever.

The loop is quite simple:

```text
IMPLEMENT
   ↓
VERIFY
   ↓
 PASS? ─── YES → REPORT
   │
   NO
   ↓
 FIX FAILED ITEMS
   ↓
VERIFY
```

That is the part I find more interesting than the coding agent itself.

LLMs can now generate a huge amount of code. The much harder question is: **does that code match the original intent?**

## Konstruktor is not trying to be a model

There is another fundamental decision: Konstruktor is not a coding agent in its own right.

It uses OpenHands as its execution layer. In the simple `run` mode, Konstruktor starts one headless OpenHands session, waits for it to finish, and saves the events and Git diff.

Architecturally, the idea looks roughly like this:

```text
              KONSTRUKTOR
                   │
        ┌──────────┴──────────┐
        │                     │
     PROCESS               STATE
        │                     │
 spec / plan / verify       artifacts
        │                     │
        └──────────┬──────────┘
                   │
               OPENHANDS
                   │
                  LLM
                   │
             repository
```

This is a deliberate separation of responsibilities.

OpenHands can work with an environment and write code. The model can reason. Konstruktor defines the **process** in which they work.

That means the executor itself may be less important than the protocol around it.

## Why not one enormous prompt?

Technically, you could write a system prompt several pages long: “First write a specification, then review it, make a plan, implement it, check every requirement…”

But a long agent session has an unpleasant property: its context gradually gets polluted. The agent remembers its own decisions, assumptions, and implementation. That makes it hard to check itself.

If the process is split into stages, the agent's context and role can change. One pass writes the specification. Another criticises it. The next implements it. Another checks the result against the specification.

This is still far from independent proof of correctness. But it is already noticeably better than this model:

```text
— Did you do everything?
— Yes.
— Are you sure?
— Absolutely.
```

## Observability matters too

Autonomy quickly becomes a debugging problem. If an agent worked for forty minutes and produced a strange result, you want to know what happened inside.

That is why every Konstruktor session saves diagnostic data: a summary, an event stream, agent logs, a Git diff, and logs from the harness itself.

Roughly like this:

```text
konstruktor-output/
└── run-.../
    ├── summary.json
    ├── events.jsonl
    ├── agent.log
    ├── agent-error.log
    ├── diff.patch
    └── harness.log
```

It is not the flashiest part of an AI-agent project. But if we ever want to trust agents with real work, this kind of observability will probably matter more than a pretty chat interface.

## One run

For a simple task, you can use Konstruktor as a headless wrapper around OpenHands:

```sh
konstruktor run \
  -t "Write unit tests for utils.py" \
  -d ./project
```

If the task needs a more formal process:

```sh
konstruktor plan \
  -t "Add email validation to the signup form" \
  -d ./project
```

In the second case, Konstruktor takes the task through the full specification, planning, implementation, and verification pipeline.

## What is the catch?

Konstruktor is experimental for now. That matters.

By default, it uses OpenHands' process sandbox rather than full container isolation. Such an agent can potentially access the current user's resources. Konstruktor deliberately refuses some sandbox modes and command policies when it cannot guarantee that OpenHands can actually enforce them.

So running tools like this on production systems or near valuable credentials without further isolation is a bad idea.

Verification is also still performed by an LLM. Seeing `REQ-042 PASS` does not turn the result into a mathematically proven correct answer. It is simply another layer of control.

Engineering rarely rests on a single perfect verification mechanism anyway. Reliability usually comes from several imperfect layers.

## What I want to test next

The question that interests me is not really: **“Can AI replace a developer completely?”** It is too broad and not especially useful.

A more practical question is this:

> What is the minimum process an agent needs so that you can give it a task in the evening and get a result in the morning that does not need to be rebuilt from scratch?

Maybe a good coding agent is not a model that writes better code. Maybe it is a system that can consistently:

```text
UNDERSTAND
SPECIFY
PLAN
BUILD
VERIFY
FIX
REPORT
```

And leaves behind enough information for a person to understand what happened.

That is what Konstruktor is trying to do right now. Not replace the engineer, but learn to work a little more like one.

[Konstruktor on GitHub](https://github.com/madduck-tech/Konstruktor){: .inline-cta }
