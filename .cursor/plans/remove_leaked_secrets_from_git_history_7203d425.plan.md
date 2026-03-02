---
name: Remove Leaked Secrets from Git History
overview: This plan will remove hardcoded secrets from test scripts and purge those files from the repository's commit history to prevent further exposure.
todos:
  - id: advise-rotation
    content: Advise user to rotate secrets in Supabase dashboard
    status: completed
  - id: clean-sh-file
    content: Modify create-test-user.sh to use environment variables
    status: completed
  - id: clean-mjs-file
    content: Modify create-test-auth-session.mjs to use environment variables
    status: completed
  - id: purge-history
    content: Run git filter-branch to remove the files from history
    status: completed
  - id: verify-clean-history
    content: Verify secrets are gone from history using git log -S
    status: completed
  - id: restore-clean-files
    content: Re-add clean test scripts to the codebase
    status: completed
isProject: false
---

1.  **Advise Immediate Secret Rotation**: I will inform you that the Supabase Service Role Key and Anon Key must be rotated immediately in your Supabase dashboard.
2.  **Clean Current Test Scripts**: I will replace the hardcoded secrets in `create-test-user.sh` and `create-test-auth-session.mjs` with references to environment variables.
3.  **Purge History**: I will use `git filter-branch` to entirely remove the versions of these files that contained secrets from the repository's history.
    - Since the files were only introduced in commit `ab6c14a`, I will rewrite history from that point forward.
    - I will verify that the secrets are no longer searchable in the git history.
4.  **Final Restoration**: I will re-add the "clean" versions of the test scripts to the current commit.
5.  **GitHub Cleanup**: You will need to force-push the rewritten history to your GitHub repository to complete the process.

**Warning**: Rewriting history is a destructive operation. If others are working on this repository, they will need to re-clone or reset their local branches.

```mermaid
graph TD
    Start["Leaked Secrets Detected"] --> Rotate["Step 1: User Rotates Keys in Supabase"]
    Rotate --> CleanFiles["Step 2: Replace hardcoded keys with env vars"]
    CleanFiles --> PurgeHistory["Step 3: git filter-branch to remove leaks from history"]
    PurgeHistory --> Verify["Step 4: Verify history is clean"]
    Verify --> ForcePush["Step 5: User force-pushes to GitHub"]
    ForcePush --> End["Repository Secure"]
```
