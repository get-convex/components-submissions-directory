import { useConvexAuth } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { SignOut, User, CaretDown, List } from "@phosphor-icons/react";

// Get base path for links (empty for local dev, /components for production)
function useBasePath() {
  return useMemo(() => {
    return window.location.origin.includes("convex.dev") ? "/components" : "";
  }, []);
}

export default function Header() {
  const basePath = useBasePath();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { user, signIn, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="border-b border-border bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo/Title */}
          <a
            href={`${basePath}/`}
            className="text-base font-medium text-text-primary hover:text-button transition-colors">
            Convex Components
          </a>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden sm:flex items-center gap-6">
            <a
              href={`${basePath}/`}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Directory
            </a>
            <a
              href={`${basePath}/submissions`}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Submissions
            </a>
            <a
              href={`${basePath}/submit`}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Submit
            </a>
            <a
              href="https://docs.convex.dev/components"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Docs
            </a>
          </nav>

          {/* Right: Auth section */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-full text-text-secondary hover:bg-bg-hover transition-colors">
              <List size={20} />
            </button>

            {/* Auth loading */}
            {authLoading && (
              <div className="w-8 h-8 rounded-full bg-bg-secondary animate-pulse" />
            )}

            {/* Not authenticated */}
            {!authLoading && !isAuthenticated && (
              <button
                onClick={() => {
                  // Save current path to return after sign-in
                  localStorage.setItem("authReturnPath", window.location.pathname);
                  signIn();
                }}
                className="px-4 py-1.5 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors">
                Sign In
              </button>
            )}

            {/* Authenticated - user menu */}
            {!authLoading && isAuthenticated && user && (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full border border-border hover:bg-bg-hover transition-colors">
                  <div className="w-6 h-6 rounded-full bg-button text-white flex items-center justify-center text-xs font-medium">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <CaretDown
                    size={12}
                    className={`text-text-secondary transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-white shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user.email}
                      </p>
                    </div>
                    <a
                      href={`${basePath}/profile`}
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                      <User size={16} />
                      My Submissions
                    </a>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                      <SignOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="sm:hidden py-3 border-t border-border flex flex-col gap-2">
            <a
              href={`${basePath}/`}
              className="px-2 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Directory
            </a>
            <a
              href={`${basePath}/submissions`}
              className="px-2 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Submissions
            </a>
            <a
              href={`${basePath}/submit`}
              className="px-2 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Submit
            </a>
            <a
              href="https://docs.convex.dev/components"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Docs
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
