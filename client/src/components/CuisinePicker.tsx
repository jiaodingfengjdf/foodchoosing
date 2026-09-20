import { useMemo, useState } from "react";
import { useCuisineTree } from "../api/hooks";
import { track } from "../lib/api";
import { useAppStore } from "../stores/useAppStore";

const MAX_LEVEL = 4;

/**
 * 全屏四级菜系选择器：大洲 → 次区域 → 国家 → 细分菜系。
 * L4 点击即确认；顶部提供「全球大乱斗」快捷项。
 */
export function CuisinePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useCuisineTree();
  const setCuisine = useAppStore((s) => s.setCuisine);
  /** 已下钻的节点 id（不含尚未确认的末级） */
  const [stack, setStack] = useState<string[]>([]);

  const nodes = useMemo(() => data?.nodes ?? [], [data]);

  const breadcrumb = useMemo(
    () => stack.map((id) => nodes.find((n) => n.id === id)).filter((n) => n !== undefined),
    [stack, nodes]
  );
  const parentId = stack.length > 0 ? stack[stack.length - 1] : null;
  const children = useMemo(
    () => nodes.filter((n) => (parentId === null ? n.level === 1 : n.parent_id === parentId)),
    [nodes, parentId]
  );
  const currentLevel = breadcrumb.length === 0 ? 1 : (breadcrumb[breadcrumb.length - 1]?.level ?? 0) + 1;

  const confirm = (id: string | null, label: string) => {
    setCuisine(id, label);
    if (id) {
      const chain = [...stack, id].map((cid) => nodes.find((n) => n.id === cid));
      track("cuisine_category_select", {
        level1_id: chain[0]?.id ?? null,
        level2_id: chain[1]?.id ?? null,
        level3_id: chain[2]?.id ?? null,
        level4_id: chain[3]?.id ?? null,
      });
    }
    setStack([]);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" data-testid="cuisine-picker">
      <header className="flex items-center gap-2 border-b border-neutral-100 p-4">
        <button
          onClick={() => (stack.length ? setStack(stack.slice(0, -1)) : onClose())}
          className="w-6 text-xl leading-none"
          aria-label={stack.length ? "返回上一级" : "关闭"}
        >
          {stack.length ? "←" : "×"}
        </button>
        <div className="flex-1 text-sm text-neutral-500">
          {stack.length === 0
            ? "选一个风味圈，或直接全球大乱斗"
            : breadcrumb.map((b) => b.name).join(" > ")}
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto">
        {stack.length === 0 && (
          <li>
            <button
              className="w-full border-b border-neutral-100 px-5 py-4 text-left"
              onClick={() => confirm(null, "全球大乱斗")}
            >
              🌍 全球大乱斗 <span className="text-xs text-neutral-400">全量库随机</span>
            </button>
          </li>
        )}

        {children.map((n) => {
          const hasChildren = nodes.some((child) => child.parent_id === n.id);
          return (
            <li key={n.id}>
              <button
                className="flex w-full items-center justify-between border-b border-neutral-100 px-5 py-4 text-left"
                onClick={() =>
                  hasChildren
                    ? setStack([...stack, n.id])
                    : confirm(n.id, [...breadcrumb.map((b) => b.name), n.name].join(" > "))
                }
              >
                <span>{n.name}</span>
                <span className="text-xs text-neutral-400">
                  {n.dish_count} 道 {hasChildren ? "›" : ""}
                </span>
              </button>
            </li>
          );
        })}

        {currentLevel > 1 && children.length === 0 && (
          <li className="p-5 text-sm text-neutral-400">这个分类下还没有菜品</li>
        )}
      </ul>
    </div>
  );
}
