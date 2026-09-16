import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { TabBar } from "./components/TabBar";
import { HomePage } from "./pages/HomePage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { AtlasPage } from "./pages/AtlasPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { replayCheckins } from "./lib/offlineQueue";

export default function App() {
  const { pathname } = useLocation();
  const showTabBar = !pathname.startsWith("/recipe/");

  // 启动即尝试补交离线打卡；恢复联网时再来一次
  useEffect(() => {
    void replayCheckins();
    const onOnline = () => void replayCheckins();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-md pb-16">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        <Route path="/atlas" element={<AtlasPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      {showTabBar && <TabBar />}
    </div>
  );
}
