import type { AdminConfig } from "@/lib/admin/config";
import { AdminApiError } from "@/lib/admin/http";

export function assertCmsWriteEnabled(config: AdminConfig) {
  if (!config.writeEnabled) {
    throw new AdminApiError(
      503,
      "write_disabled",
      "此部署目前以唯讀模式執行，無法修改文章。",
    );
  }
}

/** Reject autosaves from old tabs after the working-copy rollout. */
export function assertCanonicalSaveMode(mode: "manual" | "autosave") {
  if (mode === "autosave") throw new AdminApiError(409, "working_copy_required", "自動儲存已改用獨立工作稿。請保留目前文字並重新載入新版編輯器。");
}
