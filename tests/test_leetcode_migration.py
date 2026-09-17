import importlib.util
import io
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("migration", pathlib.Path(__file__).parents[1] / "scripts/migrate-legacy-leetcode.py")
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)

class MigrationTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name).resolve()
        self.source = self.root / "content/blog/LeetCodeEssential50/1.TwoSum/main.md"
        self.source.parent.mkdir(parents=True)
        self.original = '---\ntitle: 1. Two Sum\ndate: 2026-06-05\nsummary: Original\npublished: true\n---\n\n## 我的直覺\n原文\n\x60\x60\x60py\nprint(1)\n\x60\x60\x60\n'
        self.source.write_text(self.original, encoding="utf8")
        self.catalog = {"stat_status_pairs": [{"stat": {"frontend_question_id": 1, "question__title_slug": "two-sum"}, "difficulty": {"level": 1}}]}

    def tearDown(self):
        self.tmp.cleanup()

    def prepare(self):
        with patch.object(migration.urllib.request, "urlopen", return_value=io.BytesIO(json.dumps(self.catalog).encode())):
            migration.prepare(self.root)
        return next((self.root / ".cd/migrations").iterdir())

    def test_backup_and_body_preserving_move(self):
        run = self.prepare()
        self.assertEqual(self.source.read_text(encoding="utf8"), self.original)
        migration.apply(self.root, str(run))
        target = self.root / "content/leetcode/1-two-sum/main.md"
        updated = target.read_text(encoding="utf8")
        self.assertEqual(updated[migration.header_parts(updated).end():], self.original[migration.header_parts(self.original).end():])
        self.assertFalse(self.source.exists())
        self.assertEqual((run / "originals/LeetCodeEssential50/1.TwoSum/main.md").read_text(encoding="utf8"), self.original)
        self.assertEqual(json.loads((self.root / "content/leetcode/redirects.json").read_text())["LeetCodeEssential50/1.TwoSum"], "1-two-sum")
        with self.assertRaises(ValueError):
            migration.apply(self.root, str(run))

    def test_refuses_changed_source(self):
        run = self.prepare()
        self.source.write_text(self.original + "new edit", encoding="utf8")
        with self.assertRaises(ValueError):
            migration.apply(self.root, str(run))
        self.assertTrue(self.source.exists())
        self.assertFalse((self.root / "content/leetcode/1-two-sum").exists())

    def test_refuses_destination_collision(self):
        (self.root / "content/leetcode/1-two-sum").mkdir(parents=True)
        with self.assertRaises(ValueError):
            self.prepare()

    def test_encoded_legacy_slug(self):
        directory = self.source.parent.with_name("1.Two Sum")
        self.source.parent.rename(directory)
        self.source = directory / "main.md"
        run = self.prepare()
        migration.apply(self.root, str(run))
        redirects = json.loads((self.root / "content/leetcode/redirects.json").read_text())
        self.assertEqual(redirects["LeetCodeEssential50/1.Two%20Sum"], "1-two-sum")

if __name__ == "__main__":
    unittest.main()
