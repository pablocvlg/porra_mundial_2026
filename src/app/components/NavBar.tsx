"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? "bg-gray-800 text-white" : "bg-gray-500 text-white hover:bg-gray-800 hover:text-white";
  };

  return (
    <nav className="bg-transparent backdrop-blur-md text-white fixed w-full z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-center h-16 space-x-12">
          <Link
            href="/porra"
            className={`px-8 py-3 rounded-full transition ${isActive("/porra")}`}
          >
            Enviar porra
          </Link>
          <Link
            href="/"
            className={`px-8 py-3 rounded-full transition ${isActive("/")}`}
          >
            Inicio
          </Link>
          <Link
            href="/clasificacion"
            className={`px-8 py-3 rounded-full transition ${isActive("/clasificacion")}`}
          >
            Clasificación
          </Link>
        </div>
      </div>
    </nav>
  );
}
