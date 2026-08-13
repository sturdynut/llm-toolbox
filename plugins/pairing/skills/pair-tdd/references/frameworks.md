# Framework lookup

Two things the protocol needs from every framework: a way to park a test as **pending**
(for the test-writer's to-do list) and a way to **run exactly one test** (so a handoff
reports one clear result).

## Pending tests and single-test runs

Prefer a *todo* marker over a *skip* marker for the scaffold list where both exist: todo
means "not written yet," skip means "written and disabled." The list is the former.

| Framework | Pending / todo | Run one test |
|---|---|---|
| Vitest | `it.todo('name')` · `it.skip` | `vitest run -t "name"` |
| Jest | `it.todo('name')` · `it.skip` · `xit` | `jest -t "name"` |
| Mocha | `it('name')` with no callback · `it.skip` | `mocha --grep "name"` |
| `node:test` | `test('name', { todo: true })` · `t.todo()` | `node --test --test-name-pattern="name"` |
| pytest | `@pytest.mark.skip(reason=…)` · `@pytest.mark.xfail` | `pytest path.py::test_name` · `pytest -k "name"` |
| unittest | `@unittest.skip("reason")` | `python -m unittest mod.Class.test_name` |
| Go | `t.Skip("reason")` | `go test -run '^TestName$' ./pkg` |
| Rust | `#[ignore]` | `cargo test test_name` |
| RSpec | `it 'name'` with no block · `xit` · `pending` | `rspec path/spec.rb:42` · `rspec -e "name"` |
| JUnit 5 | `@Disabled("reason")` | `mvn test -Dtest=Class#method` · `gradle test --tests` |
| PHPUnit | `$this->markTestSkipped()` | `phpunit --filter testName` |
| xUnit (.NET) | `[Fact(Skip = "reason")]` | `dotnet test --filter FullyQualifiedName~Name` |

If the project has a test script (`npm test`, `make test`, `just test`), use it rather
than invoking the runner directly — it usually carries required flags and config.

## Reading a red: is it the *right* red?

The test-writer must confirm a new test fails **because the behaviour is missing**, not
because the test is broken. Three outcomes, three different responses:

| What you see | Means | Who fixes it |
|---|---|---|
| Assertion failure — expected X, got Y | The behaviour is missing or wrong. **This is the good red.** | Implementer |
| `is not a function`, `NameError`, `ImportError`, module not found, no such symbol | The thing doesn't exist yet. A legitimate first red — it tells the implementer what to create. | Implementer |
| `SyntaxError`, a typo'd variable, a wrong fixture path, a bad import *in the test file itself* | **The test is broken, not red.** | Test-writer — it's your file, fix it and re-run before handing off |

A compile error in a statically typed language is usually the second row, not the third:
if the code won't build because the function under test doesn't exist yet, that's a valid
red. If it won't build because of a mistake in the test, that's yours.

## Handing off a red cleanly

Quote the actual failure, trimmed to the useful line. The implementer should not have to
re-run the suite to find out what you saw.

```
State     red — TypeError: Bucket.refill is not a function
          at test/limiter.test.ts:24
```
