"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import logo from "@/branding/logo.png";
import PublicThemeToggle from "@/components/ui/PublicThemeToggle";

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "HOME", href: "#hero" },
    { label: "FOR STUDENTS", href: "#students" },
    { label: "FOR TEACHERS", href: "#teachers" },
    { label: "FOR SCHOOLS", href: "#schools" },
    { label: "ABOUT", href: "#about" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "public-header border-b py-3 shadow-md"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="#hero" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 p-2 border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-500/20 transition-all duration-300 shadow-sm">
              <Image
                src={logo}
                alt="EduPredict Logo"
                width={32}
                height={32}
                className="h-full w-full object-contain group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight pub-text-primary flex items-center gap-1">
                Edu<span className="text-cyan-500 dark:text-cyan-400">Predict</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest pub-text-muted font-semibold -mt-1">
                Smart Education
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-full border public-nav-pill px-5 py-1.5 shadow-sm">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="public-nav-link px-3.5 py-1.5 text-xs font-semibold tracking-wider rounded-full hover:bg-cyan-500/10 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center"><PublicThemeToggle /></div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <PublicThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl pub-text-secondary hover:pub-text-primary bg-slate-500/10 border pub-border-line focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-cyan-400" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 rounded-2xl border pub-border-line pub-surface p-5 backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-sm font-semibold pub-text-secondary hover:pub-text-accent hover:bg-cyan-500/10 rounded-xl transition-all"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

