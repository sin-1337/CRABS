#!/bin/bash
set -e

show_help() {
	cat <<'EOF'
Usage: ./branch.sh <command> [args]

Automate Git branch transitions, commits, promotions, deployments, and cleanup.

Commands:
  feature <name>    Create and switch to a new feature branch based off Alpha.
  commit <msg>      Stage all files (git add .) and commit with <msg>.
  promote           Promote current branch:
                      - Feature -> Alpha (merges with --no-ff, preserves history, pushes, cleans up)
                      - Alpha -> Beta (verifies clean tree + live deployment, merges, pushes)
  release           Promote Beta -> Stable (verifies live deployment, merges, tags vX.Y.Z, pushes).
  notes [base]      Generate release notes for changes between Alpha and Beta (or custom base/target).
  revert            Hard reset working directory & staging back to HEAD (discards untracked files).
  help, -h, --help  Display this help message.

Safety & Deployment Rules:
  - 'feature' always pulls latest Alpha and branches off it (requires clean tree).
  - 'promote' on Alpha checks that changes are committed and Live repo matches current build version.
  - 'promote' on Beta is blocked; you must explicitly use 'release' to touch Stable.
  - 'release' only executes from Beta after confirming deployment is current.
EOF
}

# 1. Bare invocation or explicit help flag prints help
if [[ -z "$1" || "$1" =~ ^(help|-h|--help)$ ]]; then
	show_help
	exit 0
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD | xargs)

# Helper: Verify clean working directory
ensure_clean_tree() {
	if [[ -n "$(git status --porcelain)" ]]; then
		echo "Aborting: Working directory has uncommitted changes."
		git status -s
		echo "Run './branch.sh commit \"message\"' or './branch.sh revert' first."
		exit 1
	fi
}

# Helper: Verify that ../Live has a deployment commit matching the current package.json version
ensure_deployed() {
	local branch="$1"
	local raw_ver
	raw_ver=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -n 1)

	if [[ -z "$raw_ver" ]]; then
		echo "Aborting: Could not determine version from package.json."
		exit 1
	fi

	if [[ ! -d "../Live/.git" ]]; then
		echo "Aborting: Live repository not found at ../Live."
		exit 1
	fi

	echo "Verifying deployment for version $raw_ver on $branch..."
	local last_live_commit
	last_live_commit=$(git -C ../Live log -1 --pretty=%B)

	# deploy.sh commits with: "Deploy build #$VERSION ($BRANCH)"
	if [[ "$last_live_commit" != *"$raw_ver"* || "$last_live_commit" != *"$branch"* ]]; then
		echo "Aborting: No verified deployment found in ../Live for version $raw_ver ($branch)."
		echo "Latest Live commit: $last_live_commit"
		echo "Run ./deploy.sh first before promoting or releasing."
		exit 1
	fi
	echo "Deployment verified: $last_live_commit"
}

# 2. Revert command: Hard reset and clean untracked files
if [[ "$1" == "revert" ]]; then
	read -r -p "WARNING: Hard reset $CURRENT_BRANCH to HEAD and discard all uncommitted changes? [y/N] " confirm
	if [[ "$confirm" =~ ^[Yy]$ ]]; then
		git reset --hard HEAD
		git clean -fd
		echo "Branch '$CURRENT_BRANCH' reverted to clean HEAD."
	else
		echo "Revert canceled."
	fi
	exit 0
fi

# 3. Feature branch creation: always cut from updated Alpha
if [[ "$1" == "feature" ]]; then
	if [[ -z "$2" ]]; then
		echo "Error: Branch name required."
		echo "Usage: ./branch.sh feature <branch-name>"
		exit 1
	fi

	ensure_clean_tree

	echo "Updating Alpha base branch..."
	git switch Alpha
	git pull --ff-only || true

	echo "Creating and switching to feature branch '$2' from Alpha..."
	git switch -c "$2"
	exit 0
fi

# 4. Stage & Commit helper: ./branch.sh commit "message"
if [[ "$1" == "commit" ]]; then
	if [[ -z "$2" ]]; then
		echo "Error: Commit message required."
		echo "Usage: ./branch.sh commit \"your message\""
		exit 1
	fi
	git add .
	if git diff --cached --quiet; then
		echo "No changes staged to commit."
	else
		git commit -m "$2"
		echo "Committed: $2"
	fi
	exit 0
fi

# 5. Release notes command
if [[ "$1" == "notes" ]]; then
	BASE_REF="${2:-Beta}"
	TARGET_REF="${3:-Alpha}"

	echo "=================================================="
	echo "Release Notes: $BASE_REF -> $TARGET_REF"
	echo "=================================================="

	# Exclude merge commits, build bumps, wip, fixups, and test commits
	FILTER_REGEX='^(Merge |build #|wip|temp|fixup!|test:)'

	git log --no-merges --invert-grep --grep="$FILTER_REGEX" --format="- %s (%h)" "$BASE_REF..$TARGET_REF"

	echo "=================================================="
	exit 0
fi

# 6. Promotion command
if [[ "$1" == "promote" ]]; then
	ensure_clean_tree

	case "$CURRENT_BRANCH" in
	Alpha)
		ensure_deployed "Alpha"

		echo "Promoting Alpha -> Beta (preserving commit history)..."
		git switch Beta
		git pull --ff-only || true
		git merge Alpha --no-edit
		git push origin Beta
		echo "Promoted to Beta. Returning to Alpha branch..."
		git switch Alpha
		;;

	Beta)
		echo "Error: Cannot run 'promote' on Beta."
		echo "Safety check: To promote Beta to Stable, you must run:"
		echo "   ./branch.sh release"
		exit 1
		;;

	Stable)
		echo "Already on Stable. Switching back to Alpha..."
		git switch Alpha
		;;

	*)
		# Feature branch -> standard merge into Alpha (preserves individual commits)
		FEATURE_BRANCH="$CURRENT_BRANCH"

		echo "Merging [$FEATURE_BRANCH] -> Alpha (preserving commits)..."
		git switch Alpha
		git pull --ff-only || true

		# Merge without fast-forward to maintain feature boundary while keeping commits
		git merge --no-ff "$FEATURE_BRANCH" -m "Merge feature '$FEATURE_BRANCH' into Alpha"
		git push origin Alpha

		echo "Feature '$FEATURE_BRANCH' merged into Alpha."

		read -r -p "Delete feature branch '$FEATURE_BRANCH' locally? [Y/n] " response
		response=${response:-Y}
		if [[ "$response" =~ ^[Yy]$ ]]; then
			git branch -d "$FEATURE_BRANCH" 2>/dev/null || git branch -D "$FEATURE_BRANCH"
			echo "Local branch '$FEATURE_BRANCH' deleted."

			if git rev-parse --verify "origin/$FEATURE_BRANCH" &>/dev/null; then
				read -r -p "Delete remote branch 'origin/$FEATURE_BRANCH'? [y/N] " remote_resp
				if [[ "$remote_resp" =~ ^[Yy]$ ]]; then
					git push origin --delete "$FEATURE_BRANCH"
					echo "Remote branch deleted."
				fi
			fi
		fi
		;;
	esac
	exit 0
fi

# 7. Release command: Beta -> Stable only
if [[ "$1" == "release" ]]; then
	ensure_clean_tree

	if [[ "$CURRENT_BRANCH" != "Beta" ]]; then
		echo "Error: 'release' can only be executed while on the Beta branch."
		echo "Current branch: $CURRENT_BRANCH"
		exit 1
	fi

	ensure_deployed "Beta"

	echo "Release triggered: Promoting Beta -> Stable..."
	git switch Stable
	git pull --ff-only || true
	git merge Beta --no-edit
	git push origin Stable

	# Parse 3-digit semver and tag
	RAW_VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -n 1)
	if [[ -n "$RAW_VERSION" ]]; then
		IFS='.' read -r major minor patch build <<<"$RAW_VERSION"
		TAG_VERSION="v$major.$minor.$patch"

		echo "Tagging Stable release: $TAG_VERSION (omitting build #$build)"
		git tag -a "$TAG_VERSION" -m "Release $TAG_VERSION"
		git push origin "$TAG_VERSION"
	fi

	echo "Release complete and pushed. Switching back to Alpha branch..."
	git switch Alpha
	exit 0
fi

# Fallback for unrecognized arguments
echo "Error: Unknown command '$1'"
echo "Run './branch.sh help' for usage."
exit 1
