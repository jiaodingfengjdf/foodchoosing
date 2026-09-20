import { useEffect, useState } from "react";
export function DishPhoto({ src, name, className = "" }: { src: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} /> :
    <div aria-label={`${name}实拍待补充`} className={`flex items-center justify-center bg-[#eee6dc] text-center text-xs text-[#967c65] ${className}`}>实拍待补充</div>;
}
