# Style reference

Mechanical conventions with objectively right answers. Everything here is Tier 1 — if a
rule needs judgment or taste to apply, it does not belong in this file.

## Local overrides

This file is generic and shared. Author- and project-specific calibration — real proper
nouns, house decisions, an individual's voice patterns — lives in a local override, loaded
if present:

1. `<cwd>/.claude/proofread-style.local.md`
2. `~/.claude/proofread-style.local.md`

**The local file wins on any conflict.** Read it after this one, apply its decisions over
these defaults, and append newly learned proper nouns and author preferences *there* —
never to this file. Gitignore `*.local.md` in the drafts repo.

Anything a stranger could not verify from the draft alone — the author's employer, the
spelling of their name, which constructions are their voice rather than an error — is
local-override material by definition.

## Technology proper nouns

Casing errors in these are Tier 1 fixes. Dictation and autocorrect mangle them constantly.

**Languages & runtimes:** JavaScript, TypeScript, Node.js, Python, Ruby, PHP, Java,
Kotlin, Swift, Objective-C, Rust, Go, C, C++, C#, .NET, ASP.NET, WebAssembly, SQL, Bash,
Zsh

**Web & frontend:** HTML, CSS, React, Vue, Svelte, Angular, Next.js, Remix, Astro,
Tailwind CSS, Sass, Vite, webpack, ESLint, Prettier, npm, pnpm, Yarn, Deno, Bun

**Data & infra:** PostgreSQL, MySQL, SQLite, MongoDB, Redis, Elasticsearch, Kafka, Docker,
Kubernetes, Terraform, Ansible, nginx, AWS, Azure, GCP, S3, EC2, Lambda, Cloudflare

**Protocols & formats:** HTTP, HTTPS, REST, GraphQL, gRPC, JSON, YAML, TOML, XML, CSV,
OAuth, JWT, SSH, TLS, DNS, URL, URI, UUID, API, CLI, GUI, SDK, IDE, CI/CD

**AI/ML:** LLM, GPT, PyTorch, TensorFlow, Hugging Face, CUDA, GPU, CPU, RAM, RAG, OpenAI,
Anthropic, Claude, ChatGPT, Gemini, Llama

**Tools & platforms:** GitHub, GitLab, Bitbucket, Git, VS Code, JetBrains, IntelliJ, Vim,
Neovim, Figma, Notion, Jira, Linear, Slack, Substack, macOS, iOS, iPadOS, Android, Linux,
Ubuntu, Windows

Officially lowercase-initial names stay lowercase even at sentence start (`npm`, `nginx`,
`webpack`). Rewording to avoid the awkward opener is a Tier 2 suggestion — silently
capitalizing them is not.

## Dictation artifacts

The highest-yield category in dictated prose. All Tier 1.

**Phonetic renderings of technical terms:**

| Dictation produces | Correct |
|---|---|
| Jason | JSON |
| sequel / my sequel | SQL / MySQL |
| no sequel | NoSQL |
| post gres | PostgreSQL |
| get hub | GitHub |
| node JS / node J S | Node.js |
| react J S | React |
| you I / you X | UI / UX |
| A P I | API |
| L L M | LLM |
| Fang | FAANG |
| dot net | .NET |
| C sharp | C# |

**Spacing and run-together words.** Dictation drops the space around a period inside a
term: `and.NET` → `and .NET`, `Node.jsis` → `Node.js is`. Also doubled spaces, leading
spaces on paragraphs, trailing whitespace, and missing spaces after commas.

**Spoken punctuation leaking through as words:** a literal `comma`, `period`, `new
paragraph`, or `quote` sitting in the text where the mark belongs.

**Homophones:** its/it's, your/you're, their/there/they're, then/than, to/too/two,
affect/effect, lose/loose, whose/who's, complement/compliment, principal/principle,
discreet/discrete.

**Misheard grammar:** `would of` → `would have`, `should of` → `should have`, `could of`
→ `could have`, `for all intensive purposes` → `for all intents and purposes`.

**Doubled words** at clause boundaries (`the the`; `that that` where only one is
grammatical) — but `had had` and genuine `that that` constructions are correct. Read the
sentence before cutting.

**Comma splices where a speaker paused.** Tier 1 only when the fix is unambiguous
punctuation (comma → period or semicolon). If fixing it requires rewording, it is Tier 2.

## Punctuation

- **Serial (Oxford) comma:** keep it; add it when a list is missing it. Override locally
  if the project uses AP style.
- **Quotation marks:** periods and commas go *inside* closing quotes (US convention);
  colons and semicolons outside; question marks follow sense. Override locally for British
  style.
- **Straight vs. curly quotes:** match what the file already uses. Consistent within a
  file; never convert a file wholesale.
- **Apostrophes:** plurals of acronyms and decades take none — `APIs`, `URLs`, `1990s`,
  not `API's`, `1990's`.
- **Em dashes:** do not normalize spacing. Inconsistent ` — ` vs `—` is voice.
- **Ellipses:** do not convert between `...` and `…`.
- **Hyphenation:** hyphenate compound modifiers *before* a noun, not after — `a well-known
  bug`, but `the bug is well known`. Standing compounds in technical usage: `full-stack`,
  `front-end`, `back-end`, `open-source`, `self-taught`, `bug-free`, `real-time`,
  `end-to-end`, `AI-assisted`, `AI-generated`. Never hyphenate after an `-ly` adverb: `a
  highly available service`.

## Numbers

- Spell out one through nine; numerals for 10 and up.
- Always numerals: years, versions, percentages, measurements, money, and anything in a
  technical spec (`3 retries`, `8 GB`, `HTTP 200`).
- Never start a sentence with a numeral — spelling it out is Tier 1, rewording is Tier 2.

## Capitalization

- **Headings:** match the file's existing convention (sentence case vs. title case).
  Consistent within a file; do not impose a preference across files.
- **Job titles:** lowercase in running prose, capitalized directly before a name. Authors
  who capitalize their own title are making a choice — that is a local-override decision,
  not an error.
- **After a colon:** lowercase unless what follows is a complete sentence or a proper noun.

## Voice patterns — leave alone

The constructions most often "corrected" into blandness. All are voice, not error, unless
a local override says otherwise:

- Sentence-initial `And`, `But`, `So`, `Well,`, `Now,`
- Sentence fragments used for emphasis
- One-sentence paragraphs
- Conversational hedges: `a little bit`, `sort of`, `kind of`, `pretty much`
- Archaic or folksy usage the author clearly likes (`oftentimes`, `nowadays`)
- First-person asides and self-interruptions
- A standalone italic line used as a beat or pull quote — never merge it into the
  surrounding paragraph
- A deliberate lowercase line continuing an ellipsis from the paragraph above
- `**bold**` for mid-sentence emphasis or a full-line sign-off
- A closing quotation on its own last line, attributed with `- Name`
- Comma after a sentence-opening `But,` — a spoken pause
- Regional and dialectal usage

**The three-times rule:** a construction used deliberately three or more times in a draft
is style. Stop flagging it, and if it looks durable, append it to the local override.

## What does not belong in this file

Wording preferences, tightening, "flow," synonym choices, structure, tone. Those are Tier
2 suggestions at most — and usually they are the author's business.
