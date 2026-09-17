"""Explicit, backed-up migration of the three legacy LeetCode collections.

Prepare is read-only for live content. Review the generated manifest, deploy
legacy-compatible app code, then apply the exact prepared migration.
"""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import tarfile
import tempfile
import urllib.request

GROUPS = {"LeetCode", "LeetCodeEssential50", "LeetCodeAdvanced50"}
NOTES = {"DailyLeetcodePlan": ("note", "notes/daily-practice"),
         "Essential50": ("note", "notes/essential-50"),
         "Prologue": ("note", "notes/prologue"),
         "模板": ("template", "templates/legacy-solution")}
LANGUAGES = {"py": "Python", "python": "Python", "cpp": "C++", "c++": "C++",
             "js": "JavaScript", "javascript": "JavaScript", "ts": "TypeScript", "typescript": "TypeScript"}

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def checked(root, relative):
    relative = pathlib.Path(relative)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Unsafe relative path")
    target = root / relative
    if not target.resolve().is_relative_to(root):
        raise ValueError("Path escapes deployment root")
    current = root
    for part in relative.parts:
        current /= part
        if current.is_symlink():
            raise ValueError("Symbolic link not supported")
    return target

def fingerprints(folder):
    result = {}
    for p in folder.rglob("*"):
        if p.is_symlink():
            raise ValueError("Symbolic link in article")
        if p.is_file():
            result[str(p.relative_to(folder))] = digest(p)
    return result

def header_parts(source):
    match = re.match(r"(\ufeff?---\r?\n)(.*?)(^---[ \t]*\r?$)", source, re.M | re.S)
    if not match:
        raise ValueError("Missing frontmatter")
    return match

def prepare(root):
    sources = []
    for group in sorted(GROUPS):
        directory = checked(root, "content/blog/" + group)
        if directory.is_dir():
            sources.extend(sorted(directory.glob("*/main.md")))
    if not sources:
        raise ValueError("No legacy articles to migrate")
    request = urllib.request.Request("https://leetcode.com/api/problems/all/", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        catalog = json.load(response)
    index = {int(p["stat"]["frontend_question_id"]): p for p in catalog["stat_status_pairs"]
             if str(p["stat"]["frontend_question_id"]).isdigit()}
    entries = []
    targets = set()
    for file in sources:
        checked(root, file.relative_to(root))
        source = file.read_bytes().decode("utf8")
        match = header_parts(source)
        header = match[2]
        number = re.match(r"(\d+)\.", file.parent.name)
        old_slug = str(file.parent.relative_to(root / "content/blog"))
        corrections = []
        if number:
            problem_id = int(number[1])
            title_id = re.search(r"^title:\s*[\"']?(\d+)\.", header, re.M)
            if not title_id or int(title_id[1]) != problem_id:
                raise ValueError("Title and folder problem IDs differ: " + old_slug)
            official = index[problem_id]
            slug = official["stat"]["question__title_slug"]
            target = str(problem_id) + "-" + slug
            languages = sorted({LANGUAGES[x.lower()] for x in re.findall(r"^\x60{3}([^\s\x60]+)\s*$", source, re.M)
                                if x.lower() in LANGUAGES})
            if not languages:
                raise ValueError("No recognized solution language: " + old_slug)
            metadata = {"entryType": "problem", "id": problem_id,
                        "difficulty": {1: "Easy", 2: "Medium", 3: "Hard"}[official["difficulty"]["level"]],
                        "status": "Attempted", "language": " / ".join(languages)}
        else:
            entry_type, target = NOTES[file.parent.name]
            metadata = {"entryType": entry_type, "id": None, "difficulty": None, "status": None, "language": None}
        if target in targets or checked(root, "content/leetcode/" + target).exists():
            raise ValueError("Destination collision: " + target)
        targets.add(target)
        if not re.search(r"^summary:", header, re.M):
            header, changed = re.subn(r"^summary[ \t]+(.+)$", r"summary: \1", header, flags=re.M)
            if changed != 1:
                raise ValueError("Cannot safely repair summary: " + old_slug)
            corrections.append("Added missing summary colon; summary wording unchanged")
        if re.search(r"^(kind|entryType|format|id|difficulty|status|language):", header, re.M):
            raise ValueError("Existing metadata requires review: " + old_slug)
        metadata = {"kind": "leetcode", "format": "legacy", **metadata}
        addition = "".join(key + ": " + json.dumps(value, ensure_ascii=False) + "\n" for key, value in metadata.items())
        modified = source[:match.start(2)] + header + addition + source[match.end(2):]
        assert modified[header_parts(modified).end():] == source[match.end():], "Body changed"
        entries.append({"source": old_slug, "target": target, "metadata": metadata,
                        "published": not bool(re.search(r"^published:\s*false\s*$", header, re.M)),
                        "fingerprints": fingerprints(file.parent), "corrections": corrections, "modified": modified})
    migrations = checked(root, ".cd/migrations")
    migrations.mkdir(parents=True, exist_ok=True)
    run = pathlib.Path(tempfile.mkdtemp(prefix="leetcode-", dir=migrations))
    backup = run / "content-before.tar.gz"
    with tarfile.open(backup, "w:gz") as archive:
        archive.add(root / "content", arcname="content")
    with tarfile.open(backup) as archive:
        for member in archive.getmembers():
            if member.isfile():
                archive.extractfile(member).read()
    for entry in entries:
        stage = run / "staged" / entry["target"]
        shutil.copytree(checked(root, "content/blog/" + entry["source"]), stage)
        (stage / "main.md").write_bytes(entry.pop("modified").encode("utf8"))
        entry["stagedFingerprints"] = fingerprints(stage)
    manifest = {"root": str(root), "backup": str(backup), "backupSha256": digest(backup),
                "catalogSource": "https://leetcode.com/api/problems/all/", "entries": entries}
    (run / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("Prepared:", run)
    print("Entries:", len(entries), "Problems:", sum(e["metadata"]["entryType"] == "problem" for e in entries))
    print("Backup SHA256:", manifest["backupSha256"])
    for entry in entries:
        print(entry["source"], "=>", entry["target"], entry["metadata"]["difficulty"], entry["metadata"]["language"])

def apply(root, run):
    run = checked(root, pathlib.Path(run).relative_to(root))
    manifest = json.loads((run / "manifest.json").read_text())
    if manifest["root"] != str(root) or (run / "complete.json").exists():
        raise ValueError("Wrong root or migration already applied")
    if digest(checked(root, pathlib.Path(manifest["backup"]).relative_to(root))) != manifest["backupSha256"]:
        raise ValueError("Backup checksum mismatch")
    entries = manifest["entries"]
    for entry in entries:
        source = checked(root, "content/blog/" + entry["source"])
        stage = checked(root, str(run.relative_to(root) / "staged" / entry["target"]))
        target = checked(root, "content/leetcode/" + entry["target"])
        if target.exists() or fingerprints(source) != entry["fingerprints"] or fingerprints(stage) != entry["stagedFingerprints"]:
            raise ValueError("Source/stage changed or target exists; prepare again")
    redirects_file = checked(root, "content/leetcode/redirects.json")
    old_redirects = redirects_file.read_bytes() if redirects_file.exists() else None
    redirects = json.loads(old_redirects) if old_redirects else {}
    for entry in entries:
        if entry["source"] in redirects:
            raise ValueError("Redirect collision")
        redirects[entry["source"]] = entry["target"]
    target_root = checked(root, "content/leetcode")
    target_root.mkdir(exist_ok=True)
    temporary = run / "redirects-next.json"
    temporary.write_text(json.dumps(redirects, ensure_ascii=False, indent=2) + "\n")
    os.replace(temporary, redirects_file)
    moved = []
    try:
        for entry in entries:
            source = checked(root, "content/blog/" + entry["source"])
            target = checked(root, "content/leetcode/" + entry["target"])
            stage = run / "staged" / entry["target"]
            original = run / "originals" / entry["source"]
            target.parent.mkdir(parents=True, exist_ok=True)
            original.parent.mkdir(parents=True, exist_ok=True)
            if fingerprints(source) != entry["fingerprints"]:
                raise ValueError("Source changed during migration")
            os.rename(stage, target)
            try:
                os.rename(source, original)
            except Exception:
                os.rename(target, stage)
                raise
            moved.append(entry)
        for entry in moved:
            assert fingerprints(root / "content/leetcode" / entry["target"]) == entry["stagedFingerprints"]
            assert fingerprints(run / "originals" / entry["source"]) == entry["fingerprints"]
        (run / "complete.json").write_text(json.dumps({"moved": len(moved), "verified": True}) + "\n")
    except Exception:
        for entry in reversed(moved):
            os.rename(run / "originals" / entry["source"], root / "content/blog" / entry["source"])
            os.rename(root / "content/leetcode" / entry["target"], run / "staged" / entry["target"])
        if old_redirects is None:
            os.rename(redirects_file, run / "redirects-rolled-back.json")
        else:
            redirects_file.write_bytes(old_redirects)
        raise
    print("Migration complete:", len(moved), "entries; originals retained:", run / "originals")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--apply", metavar="PREPARED_DIRECTORY")
    args = parser.parse_args()
    root = pathlib.Path(args.root)
    if not root.is_absolute() or root.resolve() != root or not (root / "content/blog").is_dir():
        raise ValueError("Expected explicit real deployment root")
    apply(root, args.apply) if args.apply else prepare(root)
