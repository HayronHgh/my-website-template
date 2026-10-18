import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { AdminApiError } from "@/lib/admin/http";
import { atomicWriteTextFile } from "@/lib/admin/articles/atomic-write";

const MAX_PLAN_BYTES = 256 * 1024;

export const practicePlanItemSchema = z.object({
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  id: z.number().int().positive().max(100_000),
  round: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(180),
});

const practicePlanItemsSchema = z
  .array(practicePlanItemSchema)
  .min(1)
  .max(200)
  .superRefine((items, context) => {
    const seen = new Set<number>();

    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: `題號 ${item.id} 重複。`,
          path: [index, "id"],
        });
      }
      seen.add(item.id);
    });
  });

const persistedPracticePlanSchema = z.object({
  items: practicePlanItemsSchema,
  updatedAt: z.string().datetime(),
  version: z.literal(1),
});

export const updatePracticePlanSchema = z.object({
  items: practicePlanItemsSchema,
  revision: z.string().min(1).max(128),
});

export type PracticePlanItem = z.infer<typeof practicePlanItemSchema>;
export type PracticePlan = {
  items: PracticePlanItem[];
  revision: string;
  title: string;
  updatedAt: string | null;
};

const SECOND_STAGE_TITLE = "第二階段：進階 50 題";

const seededRounds: Array<[string, Array<[number, string]>]> = [
  [
    "第一輪",
    [
      [100, "Same Tree"],
      [101, "Symmetric Tree"],
      [110, "Balanced Binary Tree"],
      [543, "Diameter of Binary Tree"],
      [572, "Subtree of Another Tree"],
      [133, "Clone Graph"],
      [547, "Number of Provinces"],
      [207, "Course Schedule"],
      [17, "Letter Combinations of a Phone Number"],
      [22, "Generate Parentheses"],
    ],
  ],
  [
    "第二輪",
    [
      [98, "Validate Binary Search Tree"],
      [230, "Kth Smallest Element in a BST"],
      [235, "Lowest Common Ancestor of a Binary Search Tree"],
      [236, "Lowest Common Ancestor of a Binary Tree"],
      [105, "Construct Binary Tree from Preorder and Inorder Traversal"],
      [210, "Course Schedule II"],
      [684, "Redundant Connection"],
      [130, "Surrounded Regions"],
      [215, "Kth Largest Element in an Array"],
      [347, "Top K Frequent Elements"],
    ],
  ],
  [
    "第三輪",
    [
      [417, "Pacific Atlantic Water Flow"],
      [127, "Word Ladder"],
      [39, "Combination Sum"],
      [79, "Word Search"],
      [131, "Palindrome Partitioning"],
      [51, "N-Queens"],
      [973, "K Closest Points to Origin"],
      [23, "Merge k Sorted Lists"],
      [295, "Find Median from Data Stream"],
      [56, "Merge Intervals"],
    ],
  ],
  [
    "第四輪",
    [
      [57, "Insert Interval"],
      [435, "Non-overlapping Intervals"],
      [452, "Minimum Number of Arrows to Burst Balloons"],
      [55, "Jump Game"],
      [45, "Jump Game II"],
      [134, "Gas Station"],
      [763, "Partition Labels"],
      [70, "Climbing Stairs"],
      [198, "House Robber"],
      [213, "House Robber II"],
    ],
  ],
  [
    "第五輪",
    [
      [322, "Coin Change"],
      [300, "Longest Increasing Subsequence"],
      [62, "Unique Paths"],
      [139, "Word Break"],
      [1143, "Longest Common Subsequence"],
      [416, "Partition Equal Subset Sum"],
      [647, "Palindromic Substrings"],
      [84, "Largest Rectangle in Histogram"],
      [42, "Trapping Rain Water"],
      [239, "Sliding Window Maximum"],
    ],
  ],
];

export const seededPracticePlanItems: PracticePlanItem[] = seededRounds.flatMap(
  ([round, problems]) =>
    problems.map(([id, title]) => ({
      completed: id === 100,
      completedAt: null,
      id,
      round,
      title,
    })),
);

function cloneSeedItems() {
  return seededPracticePlanItems.map((item) => ({ ...item }));
}

function revisionFor(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function seededPlan(): PracticePlan {
  const items = cloneSeedItems();
  return {
    items,
    revision: revisionFor({ items, updatedAt: null, version: 1 }),
    title: SECOND_STAGE_TITLE,
    updatedAt: null,
  };
}

async function assertSafeDirectory(directory: string) {
  let stat: Awaited<ReturnType<typeof fs.lstat>>;

  try {
    stat = await fs.lstat(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new AdminApiError(503, "practice_plan_unavailable", "LeetCode 內容目錄不存在。");
    }
    throw error;
  }

  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new AdminApiError(503, "practice_plan_unavailable", "LeetCode 內容目錄不安全。");
  }
}

export function createPracticePlanStore({
  directory = path.join(process.cwd(), "content", "leetcode"),
  now = () => new Date(),
}: {
  directory?: string;
  now?: () => Date;
} = {}) {
  const filePath = path.join(directory, "practice-plan.json");
  let mutationQueue = Promise.resolve();

  async function read(): Promise<PracticePlan> {
    await assertSafeDirectory(directory);

    let stat: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stat = await fs.lstat(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return seededPlan();
      }
      throw error;
    }

    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_PLAN_BYTES) {
      throw new AdminApiError(500, "invalid_practice_plan", "刷題順序檔案格式不安全或過大。");
    }

    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch (error) {
      throw new AdminApiError(500, "practice_plan_read_failed", "無法讀取刷題順序。", error);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AdminApiError(500, "invalid_practice_plan", "刷題順序檔案不是有效 JSON。");
    }

    const result = persistedPracticePlanSchema.safeParse(parsed);
    if (!result.success) {
      throw new AdminApiError(500, "invalid_practice_plan", "刷題順序檔案未通過驗證。");
    }

    return {
      items: result.data.items,
      revision: revisionFor(result.data),
      title: SECOND_STAGE_TITLE,
      updatedAt: result.data.updatedAt,
    };
  }

  function update(input: z.infer<typeof updatePracticePlanSchema>) {
    const run = mutationQueue.then(async () => {
      const current = await read();
      if (current.revision !== input.revision) {
        throw new AdminApiError(409, "revision_conflict", "刷題順序已在其他分頁更新，請重新載入。", {
          currentRevision: current.revision,
          updatedAt: current.updatedAt,
        });
      }

      const next = {
        items: input.items,
        updatedAt: now().toISOString(),
        version: 1 as const,
      };
      await atomicWriteTextFile(filePath, `${JSON.stringify(next, null, 2)}\n`);
      return {
        items: next.items,
        revision: revisionFor(next),
        title: SECOND_STAGE_TITLE,
        updatedAt: next.updatedAt,
      } satisfies PracticePlan;
    });

    mutationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return { filePath, read, update };
}

export const practicePlanStore = createPracticePlanStore();
