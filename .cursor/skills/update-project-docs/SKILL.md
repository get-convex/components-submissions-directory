# Update project docs

Use this skill after completing any feature, fix, or migration to keep the three core project tracking files in sync.

Activate with: `@update-project-docs`

## Step 1: Get real dates

Run this first:

```bash
git log --date=short -n 10
```

Use actual commit dates. Never use placeholder dates or future months.

## Step 2: Update TASK.md

Move completed items into `## Completed` with the date:

```markdown
- [x] Feature name (YYYY-MM-DD)
  - [x] Sub-task detail
  - [x] Sub-task detail
```

Add a session update note at the top of `## Current Status`:

```markdown
Session updates complete on YYYY-MM-DD.
```

If new work is queued, add it under `## To Do`.

## Step 3: Update changelog.md

Follow https://keepachangelog.com/en/1.0.0/ format. Add the new entry at the top under `## [Unreleased]` or as a versioned release:

```markdown
## [vX.Y.Z] - YYYY-MM-DD

### Added
- Feature name with key details

### Fixed
- Bug description and resolution

### Changed
- What changed and why
```

Version increment guide (check existing version in changelog.md first):
- New feature: bump minor (2.20.x -> 2.21.0)
- Bug fix or small improvement: bump patch (2.20.0 -> 2.20.1)

## Step 4: Update files.md

Only update if new files were added or if existing file descriptions are outdated.

- Add new files to the correct table section
- Keep descriptions to 1-2 sentences, no emoji
- Focus on what the file does and any key implementation details

## Checklist

Before calling this done, confirm:

- [ ] `git log --date=short` run to get real dates
- [ ] `TASK.md` completed section updated with date and sub-items
- [ ] `changelog.md` new entry added with real version and date
- [ ] `files.md` updated if new files exist

## Notes

- This skill applies to this project. If the project you are working on does not have these exact files, adapt the steps to whatever tracking files exist.
- Do not create `README.md`, `CONTRIBUTING.md`, or other documentation files unless explicitly requested.
