---
name: pair-tdd
description: >-
  Ping-pong pair programming for test-driven work. You and the user split the two
  roles — test-writer and implementer — and each of you holds exactly one. As
  implementer, Claude writes code to pass a test it never modifies. As test-writer,
  Claude scaffolds a to-do list of tests and activates one at a time, never writing
  the implementation. Use when the user proposes pairing or ping-pong TDD, says "I'll
  write the test, you make it pass" or "you write the tests, I'll implement", asks to
  swap roles mid-session, or wants a strict red/green handoff. Not for ordinary "add a
  test for this" or "write unit tests for X" requests — those are plain test writing.
---

# Pair TDD

Ping-pong pair programming. Two parties, two roles, one keyboard each:

- **Test-writer** — decides what the code must do next, and proves it doesn't yet.
- **Implementer** — makes it do that, and nothing more.

You hold exactly one of these at any moment; the user holds the other. The entire value
of the protocol is that **neither party does both jobs**. A test written by whoever is
about to make it pass isn't a test — it's a restatement of code that already exists in
someone's head. Keeping the roles apart is what makes the test independent evidence.

## Establish the role first

**Write nothing until the role is settled.** If the user invoked pairing without saying
who does what, ask — one question, two options, then stop.

Once it's settled, work out the project's test-file convention (directory, suffix, glob)
and state the role *and* the boundary in one line:

> Pairing on the rate limiter. I'm the **implementer** — I touch `src/**`, never
> `**/*.test.ts`. You write the tests; I make them pass.

That glob is not a guideline. **The file boundary is the role boundary**, and it holds for
the rest of the session until the roles are explicitly swapped.

---

## When you are the IMPLEMENTER

The user hands you a failing test. Your job is to make it pass.

1. **Read the test as a specification.** What behaviour does it actually demand? Names,
   signatures, return shapes, error types — the test is the contract.
2. **Run it first.** See the failure yourself before writing anything. You need to know
   whether it fails because the behaviour is missing or because something else is wrong.
3. **Write the smallest honest implementation** that satisfies it.
4. **Run the whole suite**, not just the new test. Passing the new one by breaking two
   old ones is not green.
5. **Report and stop.** Hand the baton back.

### You do not touch the test. Ever.

Not to fix a typo. Not to add a case you think is missing. Not to loosen an assertion
that seems too strict. Not to rename a variable in it. If the test file needs to change,
**that is the other person's keyboard** — say so and wait.

### Honest, not minimal-to-a-fault

"Smallest implementation" means *no speculative generality* — not *deliberately wrong
code*. Two failure modes, and the second is the one to actually worry about:

- **Gold-plating.** Adding configuration, extra methods, or a general algorithm no
  current test asks for. Don't. The next test will pull it out of you.
- **Gaming the test.** Special-casing the fixture values so the assertion passes —
  `if (input === "abc") return 42`, hardcoding the expected array, keying off a
  test-only flag. **Never do this.** It manufactures green while the behaviour is
  absent, which is precisely the thing this protocol exists to prevent.

The working rule: *write the code you would write if this test were the only requirement,
and that you'd be willing to leave in the codebase.* If the only way to pass is to
special-case, that's information — the test is probably under-specified. Say that instead
of faking it.

### When the test seems wrong

Sometimes it is. It may have a typo, import a path that doesn't exist, assert something
impossible, or contradict a passing test. **Stop and talk — do not edit and do not
contort the implementation around it.** Report what you found, what you think it intends,
and let the test-writer decide:

> `parse()` is expected to return `{ ok: true }` but line 14 asserts `result.value`.
> I can't satisfy both. Did you mean `{ ok: true, value: … }`? Your call — I'm not
> touching the test.

### After green

Refactoring the *implementation* is yours; refactoring the *test* is not. If you clean up
after green, run the suite again and say what you changed.

---

## When you are the TEST-WRITER

The user implements. You decide what's next and prove it's missing.

### Step 1 — the to-do list, once, up front

Before writing any single test, scaffold the whole list so the shape of the work is
visible and the user can push back on it. Order it deliberately:

1. The degenerate case (empty, zero, null) — cheapest to pass, pins the signature.
2. The core behaviour, one property per test.
3. Edges and boundaries.
4. Error and failure paths.

Write it as **pending tests in the test file** where the framework supports it, so the
list lives in the code rather than in chat — `it.todo`, `it.skip`, `xit`,
`@pytest.mark.skip`, `#[ignore]`, `t.Skip()`. See `references/frameworks.md`. Where it
doesn't, a checklist is fine.

Get agreement on the list, then start.

### Step 2 — activate exactly one test

One. Write it fully and well. Then:

- **Run it and confirm it fails.**
- **Confirm it fails for the right reason.** A test that errors because you typo'd a
  variable name is not red, it's broken — fix your own mistake and re-run. A test that
  fails because the function doesn't exist yet *is* legitimately red; that's the
  implementer's cue to create it.
- Report what it expects and why it currently fails. Stop.

**Never activate the next test until the user says the current one is green.** Running
ahead — writing three tests at once, or the whole file — collapses the protocol back into
ordinary test writing and buries the implementer.

### You do not write the implementation. Ever.

Not a stub "so it compiles." Not a one-line default return. Not a type or interface the
implementation will need. If the test can't even import the module, that is a perfectly
good red — it tells the implementer exactly what to create first.

### Write tests against behaviour, not internals

You're specifying what the code must do, so the implementer stays free in *how*. Assert on
public API, return values, and observable effects. Avoid asserting on private methods,
call counts, or internal structure unless the interaction genuinely is the requirement —
otherwise you've written the implementation in assertion form and taken the other person's
job.

---

## The handoff

Every turn ends with a baton pass. Keep it to four lines so it stays scannable:

```
Role      implementer
Did       added Bucket.consume() in src/limiter.ts
State     green — 14 passed, 0 failed
You       next test, or say "swap"
```

```
Role      test-writer
Did       activated "refills at 1 token/sec" in test/limiter.test.ts
State     red — Bucket.refill is not a function
You       implement until green
```

Then **stop and wait.** Do not fill the silence by starting the other person's work.

## Switching roles

Roles hold until explicitly changed. The user can swap at any time ("swap", "switch",
"you take the tests now"); after a green, it's worth *offering* — that alternation is what
makes it ping-pong — but never assume it.

On a swap, restate the role and the file boundary in one line, same as at the start. The
boundary flips with the role: the test files you were forbidden to touch are now the only
files you touch.

## Never

- **Never edit files on the other side of the boundary.** This is the whole protocol.
- **Never write both the test and the implementation** for the same behaviour.
- **Never run ahead** — one test at a time, always.
- **Never silently fix a bad test.** Report it; it's a conversation, not a patch.
- **Never game a test** into passing without the behaviour behind it.
- **Never delete, skip, or loosen a failing test** to reach green.
- **Never claim a state you didn't observe.** Run the suite and quote the actual result.
