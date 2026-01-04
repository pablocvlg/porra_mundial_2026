"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? "bg-blue-700" : "hover:bg-blue-600";
  };

  return (
    <nav className="bg-blue-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold">
            ⚽ Porra Mundial 2026
          </Link>

          <div className="flex space-x-4">
            <Link
              href="/"
              className={`px-4 py-2 rounded transition ${isActive("/")}`}
            >
              Inicio
            </Link>
            <Link
              href="/porra"
              className={`px-4 py-2 rounded transition ${isActive("/porra")}`}
            >
              Enviar Porra
            </Link>
            <Link
              href="/porra-view"
              className={`px-4 py-2 rounded transition ${isActive("/porra-view")}`}
            >
              Ver Estado
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}