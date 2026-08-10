#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SLUGS=("paco-video-production" "paco-interactive-educator" "edge-tts" "seedance" "video-use" "manim-video")
DRY_RUN=0
SKILL_SELECTION="all"

usage() {
  printf '%s\n' "Usage: ./install.sh <codex|claude|hermes|all> [paco-video-production|paco-interactive-educator|edge-tts|seedance|video-use|manim-video|all] [--dry-run]"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

if [[ $# -lt 1 || $# -gt 3 ]]; then
  usage
  exit 2
fi

TARGET="$1"
shift

case "$TARGET" in
  codex|claude|hermes|all) ;;
  *)
    usage
    exit 2
    ;;
esac

for argument in "$@"; do
  case "$argument" in
    --dry-run) DRY_RUN=1 ;;
    paco-video-production|paco-interactive-educator|edge-tts|seedance|video-use|manim-video|all)
      [[ "$SKILL_SELECTION" == "all" ]] || fail "Skill selection supplied more than once"
      SKILL_SELECTION="$argument"
      ;;
    *) fail "Unknown option: $argument" ;;
  esac
done

if [[ "$SKILL_SELECTION" == "all" ]]; then
  SELECTED_SKILLS=("${SKILL_SLUGS[@]}")
else
  SELECTED_SKILLS=("$SKILL_SELECTION")
fi

for skill_slug in "${SELECTED_SKILLS[@]}"; do
  [[ -f "$SCRIPT_DIR/skills/$skill_slug/SKILL.md" ]] || fail "Skill source not found: skills/$skill_slug"
done

install_link() {
  local agent_name="$1"
  local skills_dir="$2"
  local skill_slug="$3"
  local source_dir="$SCRIPT_DIR/skills/$skill_slug"
  local destination="$skills_dir/$skill_slug"

  if [[ -L "$destination" ]]; then
    local existing_target
    existing_target="$(readlink "$destination")"
    if [[ "$existing_target" == "$source_dir" ]]; then
      printf '%s: %s already installed at %s\n' "$agent_name" "$skill_slug" "$destination"
      return 0
    fi
  fi

  if [[ -e "$destination" || -L "$destination" ]]; then
    printf 'Error: %s destination already exists: %s\n' "$agent_name" "$destination" >&2
    return 1
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s: link %s -> %s\n' "$agent_name" "$destination" "$source_dir"
    return 0
  fi

  mkdir -p "$skills_dir"
  ln -s "$source_dir" "$destination"
  printf '%s: installed %s at %s\n' "$agent_name" "$skill_slug" "$destination"
}

install_for_agent() {
  local agent_name="$1"
  local skills_dir="$2"
  local status=0
  local skill_slug

  for skill_slug in "${SELECTED_SKILLS[@]}"; do
    install_link "$agent_name" "$skills_dir" "$skill_slug" || status=1
  done
  return "$status"
}

run_install() {
  local status=0
  case "$TARGET" in
    codex)
      install_for_agent "Codex" "${CODEX_HOME:-$HOME/.codex}/skills" || status=1
      ;;
    claude)
      install_for_agent "Claude Code" "$HOME/.claude/skills" || status=1
      ;;
    hermes)
      install_for_agent "Hermes Agent" "$HOME/.hermes/skills" || status=1
      ;;
    all)
      install_for_agent "Codex" "${CODEX_HOME:-$HOME/.codex}/skills" || status=1
      install_for_agent "Claude Code" "$HOME/.claude/skills" || status=1
      install_for_agent "Hermes Agent" "$HOME/.hermes/skills" || status=1
      ;;
  esac
  return "$status"
}

run_install
