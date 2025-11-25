# Contributing to BodyMetrics

First off, thank you for considering contributing to BodyMetrics! It's people like you that make this tool useful for the community.

## 🛠️ How to Contribute

### 1. Reporting Bugs
If you find a bug, please create a **GitHub Issue** describing:
* What you expected to happen.
* What actually happened.
* Steps to reproduce the error.
* (Optional) Attach a sanitized CSV sample if related to parsing.

### 2. Suggesting Enhancements
Open an Issue with the tag `enhancement`. Describe why this feature would be useful for dietitians or users.

### 3. Pull Requests (PR)
1.  **Fork** the repository.
2.  Create a new branch: `git checkout -b feature/my-new-feature`.
3.  Make your changes.
4.  **Test** your changes locally (`npm run dev`).
5.  Commit your changes using conventional commits (e.g., `feat: add new chart`, `fix: correct csv export`).
6.  Push to the branch: `git push origin feature/my-new-feature`.
7.  Submit a **Pull Request** to the `main` branch.

## 🎨 Coding Standards

* **Language:** All code comments and documentation must be in **English**.
* **Framework:** Use SvelteKit best practices.
* **Styling:** Use Tailwind CSS utility classes. Avoid custom CSS unless necessary.
* **Linting:** Ensure your code passes standard linting checks.

## 🌍 Translations

If you are adding new text to the UI, please update both:
* `src/lib/locales/en.json`
* `src/lib/locales/es.json`