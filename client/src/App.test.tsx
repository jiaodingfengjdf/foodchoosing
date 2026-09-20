import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// 页面实现（Task 13+）后会用到这些模块，先按计划隔离掉网络与本地存储。
vi.mock("./api/hooks", () => ({
  useCatalog: () => ({ data: undefined }),
  useCuisineTree: () => ({ data: undefined }),
  useProfile: () => ({ data: undefined }),
  useFavorites: () => ({ data: undefined }),
  useBadges: () => ({ data: undefined }),
  // HomePage 接入转盘后会调用这两个 hook，缺失会导致渲染直接抛错
  useSpin: () => ({ mutate: vi.fn(), isError: false, isPending: false }),
  useReroll: () => ({ mutate: vi.fn(), isPending: false }),
  // 详情页路由（本文件第三个用例会渲染它）需要这两个，缺失同样会抛错
  useRecipe: () => ({ data: undefined, isLoading: false }),
  useFavoriteToggle: () => ({ mutate: vi.fn() }),
  useSettings: () => ({ mutate: vi.fn() }),
}));
vi.mock("./lib/api", () => ({
  api: vi.fn().mockResolvedValue({}),
  apiForm: vi.fn().mockResolvedValue({}),
  track: vi.fn(),
}));
vi.mock("./lib/device", () => ({ getDeviceId: () => "test-device" }));
vi.mock("./lib/offlineQueue", () => ({
  pendingCheckins: () => [],
  enqueueCheckin: vi.fn(),
  removeCheckin: vi.fn(),
  replayCheckins: vi.fn().mockResolvedValue(undefined),
}));

/** App 内部使用 useLocation，必须置于 Router 上下文（计划原文未包 Router，会直接抛错）。 */
const renderAt = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

describe("App 布局", () => {
  it("首页渲染 4 个底部 Tab", () => {
    renderAt("/");
    expect(screen.getByTestId("tabbar")).toBeInTheDocument();
    expect(screen.getByText("转盘")).toBeInTheDocument();
    expect(screen.getByText("图鉴")).toBeInTheDocument();
    expect(screen.getByText("收藏")).toBeInTheDocument();
    expect(screen.getByText("我的")).toBeInTheDocument();
  });

  it("食谱详情页隐藏 TabBar", () => {
    renderAt("/recipe/RC_SC_001");
    expect(screen.queryByTestId("tabbar")).toBeNull();
  });

  it("子页仍显示 TabBar", () => {
    renderAt("/atlas");
    expect(screen.getByTestId("tabbar")).toBeInTheDocument();
  });
});
