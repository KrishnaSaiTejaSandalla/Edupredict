from pathlib import Path
import shutil

ROOT = Path.cwd()

SOURCE_DIRS = [
    ROOT / "app",
    ROOT / "components",
    ROOT / "lib",
    ROOT / "scripts",
    ROOT / "store",
    ROOT / "driver-app" / "src",
]

EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"}

# Only repair the exact mojibake sequences we know are corrupted.
REPLACEMENTS = {
    "ðŸ“Š": "📊",
    "ðŸ’¬": "💬",
    "ðŸ’¡": "💡",
    "ðŸ—\x9dï¸\x8f": "🗂️",
    "âœ\x8dï¸\x8f": "✍️",
    "ðŸ\x8f†": "🏆",
    "ðŸ§\xa0": "🧠",
    "âœ…": "✅",

    "ðŸ§©": "🧩",
    "ðŸš€": "🚀",
    "ðŸ†": "🆕",
    "ðŸŽ¯": "🎯",
    "ðŸ“…": "📅",
    "ðŸ“": "📌",

    "âš¡": "⚡",
    "âš ï¸": "⚠️",
    "âš": "⚠",

    "â†‘": "↑",
    "â†“": "↓",
    "â†’": "→",

    "â€”": "—",
    "â€“": "–",
    "â€¢": "•",
    "â–²": "▲",
    "â–¼": "▼",
    "Â·": "·",
    "Ã—": "×",
}
changed = []

for base in SOURCE_DIRS:
    if not base.exists():
        continue

    for path in base.rglob("*"):
        if not path.is_file():
            continue

        if path.suffix.lower() not in EXTENSIONS:
            continue

        if any(part in {
            "node_modules",
            ".git",
            ".next",
            "dist",
            "build",
            ".expo",
            "coverage",
            ".turbo",
        } for part in path.parts):
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue

        repaired = text

        for bad, good in REPLACEMENTS.items():
            repaired = repaired.replace(bad, good)

        if repaired == text:
            continue

        backup = path.with_suffix(
            path.suffix + ".mojibake-backup"
        )

        if not backup.exists():
            shutil.copy2(path, backup)

        path.write_text(
            repaired,
            encoding="utf-8",
            newline=""
        )

        changed.append(str(path.relative_to(ROOT)))

print()
print("=== SAFE MOJIBAKE REPAIR ===")
print(f"Files repaired: {len(changed)}")

for file in changed:
    print("FIXED:", file)

print()
print("No node_modules/.next/build files were touched.")
print("Backups are stored as *.mojibake-backup")