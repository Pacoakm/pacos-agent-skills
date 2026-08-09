#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/skills/paco-video-production"
SKILL_SLUG="paco-video-production"
DRY_RUN=0

usage() {
  printf '%s\n' "Usage: ./install.sh <codex|claude|hermes|all> [--dry-run]"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

if [[ ! -f "$SOURCE_DIR/SKILL.md" ]]; then
  fail "Skill source not found at $SOURCE_DIR"
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 2
fi

TARGET="$1"
if [[ $# -eq 2 ]]; then
  [[ "$2" == "--dry-run" ]] || fail "Unknown option: $2"
  DRY_RUN=1
fi

case "$TARGET" in
  codex|claude|hermes|all) ;;
  *)
    usage
    exit 2
    ;;
esac

install_link() {
  local agent_name="$1"
  local skills_dir="$2"
  local destination="$skills_dir/$SKILL_SLUG"

  if [[ -L "$destination" ]]; then
    local existing_target
    existing_target="$(readlink "$destination")"
    if [[ "$existing_target" == "$SOURCE_DIR" ]]; then
      printf '%s: already installed at %s\n' "$agent_name" "$destination"
      return
    fi
  fi

  if [[ -e "$destination" || -L "$destination" ]]; then
    fail "$agent_name destination already exists: $destination"
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s: link %s -> %s\n' "$agent_name" "$destination" "$SOURCE_DIR"
    return
  fi

  mkdir -p "$skills_dir"
  ln -s "$SOURCE_DIR" "$destination"
  printf '%s: installed at %s\n' "$agent_name" "$destination"
}

install_codex() {
  local codex_root="${CODEX_HOME:-$HOME/.codex}"
  install_link "Codex" "$codex_root/skills"
}

install_claude() {
  install_link "Claude Code" "$HOME/.claude/skills"
}

install_hermes() {
  install_link "Hermes Agent" "$HOME/.hermes/skills"
}

case "$TARGET" in
  codex) install_codex ;;
  claude) install_claude ;;
  hermes) install_hermes ;;
  all)
    install_codex
    install_claude
    install_hermes
    ;;
esac
