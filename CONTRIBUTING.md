# Contributing Guidelines

Thank you for contributing! To maintain strict quality control and protect the codebase, this project strictly uses the **Fork & Pull Request model** targeting the `develop` branch. Direct pushes to this repository are disabled.

---

## 🔄 Contribution Workflow

### 1. Fork the Repository
Click **Fork** at the top right of this repository page to create a copy under your GitHub account.

### 2. Clone Your Fork
Clone your personal fork locally:
```bash
git clone https://github.com/YOUR-USERNAME/REPOSITORY-NAME.git
cd REPOSITORY-NAME
```

### 3. Add the Upstream Remote
Link your local environment to the main repository to stay updated:
```bash
git remote add upstream https://github.com/ORIGINAL-OWNER/REPOSITORY-NAME.git
git fetch upstream
```

### 4. Branch Off `develop`
Create a feature branch based strictly on the upstream `develop` branch:
```bash
git checkout -b feature/your-feature-name upstream/develop
```

### 5. Commit and Push to Your Fork
Make changes, commit, and push your feature branch to **your fork** (`origin`):
```bash
git add .
git commit -m "feat: concise description of changes"
git push origin feature/your-feature-name
```

### 6. Create the Pull Request
1. Open the original repository on GitHub.
2. Select **New Pull Request** > **Compare across forks**.
3. Set your target branches:
   * **Base Repository:** `ORIGINAL-OWNER/REPOSITORY-NAME`
   * **Base Branch:** **`develop`** *(⚠️ Never select `main`)*
   * **Head Repository:** `YOUR-USERNAME/REPOSITORY-NAME`
   * **Compare Branch:** `feature/your-feature-name`
4. Submit the PR for review.

---

## 🛡️ Repository Rules

* **`main` Branch:** Locked. Reserved exclusively for stable releases performed by the repository owner.
* **`develop` Branch:** Active integration branch. All incoming cross-fork PRs must target this branch.
* **Direct Pushes:** Disabled for all users across all primary repository branches.
