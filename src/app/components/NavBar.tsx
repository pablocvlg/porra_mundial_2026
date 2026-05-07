"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path
      ? "bg-white text-black font-semibold"
      : "bg-gray-500 text-white hover:bg-gray-800 hover:text-white";
  };

  return (
    <nav className="bg-transparent backdrop-blur-md text-white fixed w-full z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-center h-12 space-x-12">
          <Link
            href="/porra"
            className={`px-8 py-1.5 rounded-full transition ${isActive("/porra")}`}
          >
            Enviar porra
          </Link>
          <Link
            href="/home"
            className={`px-8 py-1.5 rounded-full transition ${isActive("/home")}`}
          >
            Inicio
          </Link>
          <Link
            href="/clasificacion"
            className={`px-8 py-1.5 rounded-full transition ${isActive("/clasificacion")}`}
          >
            Clasificación
          </Link>
        </div>
      </div>
    </nav>
  );
}