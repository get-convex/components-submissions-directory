import { useConvexAuth } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { useState, useRef, useEffect } from "react";
import {
  SignOut,
  User,
  CaretDown,
  List,
  GithubLogo,
  DiscordLogo,
  House,
} from "@phosphor-icons/react";
import { FileTextIcon } from "@radix-ui/react-icons";

// Get base path for links (always /components)
function useBasePath() {
  return "/components";
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
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 pt-[0.438rem]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-[3.438rem] rounded-full bg-white/95 backdrop-blur-sm border border-border shadow-sm px-4">
          {/* Left: Logo + Nav links */}
          <div className="flex items-center gap-6">
            <a href="https://convex.dev/" className="flex items-center">
              <img
                src="/components/convex-wordmark-black.svg"
                alt="Convex"
                className="h-[70px] w-auto"
              />
            </a>

            {/* Nav links (desktop) */}
            <nav className="hidden sm:flex items-center gap-5">
              <a
                href={`${basePath}/`}
                className="text-sm font-medium text-text-primary hover:text-text-secondary transition-colors"
              >
                Directory
              </a>
              <a
                href={`${basePath}/submissions`}
                className="text-sm font-medium text-text-primary hover:text-text-secondary transition-colors"
              >
                Submissions
              </a>
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Icons, Submit, Auth section */}
          <div className="flex items-center gap-3">
            {/* Desktop right nav */}
            <nav className="hidden sm:flex items-center gap-3">
              <a
                href={`${basePath}/submit`}
                className="text-sm font-medium text-text-primary hover:text-text-secondary transition-colors"
              >
                Submit
              </a>
              <div className="w-px h-4 bg-border mx-1" />
              <a
                href="https://convex.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                title="Convex Home"
              >
                <House size={16} />
              </a>
              <a
                href="https://docs.convex.dev/components"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                title="Documentation"
              >
                <FileTextIcon className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/get-convex/convex-backend"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                title="GitHub"
              >
                <GithubLogo size={16} />
              </a>
              <a
                href="https://discord.gg/convex"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                title="Discord"
              >
                <DiscordLogo size={16} />
              </a>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-full text-text-primary hover:bg-bg-hover transition-colors"
            >
              <List size={20} />
            </button>

            {/* Auth loading */}
            {authLoading && (
              <div className="w-8 h-8 rounded-full bg-bg-hover animate-pulse" />
            )}

            {/* Not authenticated */}
            {!authLoading && !isAuthenticated && (
              <button
                onClick={() => {
                  localStorage.setItem(
                    "authReturnPath",
                    window.location.pathname
                  );
                  signIn();
                }}
                className="px-4 py-1.5 rounded-full text-sm font-normal bg-button-dark text-white hover:bg-button-dark-hover transition-colors"
              >
                Log in
              </button>
            )}

            {/* Authenticated - user menu */}
            {!authLoading && isAuthenticated && user && (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1 p-1 rounded-full hover:bg-bg-hover transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-button text-white flex items-center justify-center text-xs font-medium">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <CaretDown
                    size={12}
                    className={`text-text-secondary transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-white shadow-lg py-1 z-50">
                    <a
                      href={`${basePath}/profile`}
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                    >
                      <User size={16} />
                      My Submissions
                    </a>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                    >
                      <SignOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav dropdown - outside the pill */}
      {mobileMenuOpen && (
        <div className="sm:hidden max-w-7xl mx-auto mt-2 px-4">
          <nav className="bg-white/95 backdrop-blur-sm border border-border rounded-2xl shadow-sm p-4 flex flex-col gap-2">
            <a
              href={`${basePath}/`}
              className="px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              Directory
            </a>
            <a
              href={`${basePath}/submissions`}
              className="px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              Submissions
            </a>
            <a
              href={`${basePath}/submit`}
              className="px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              Submit
            </a>
            <div className="flex items-center gap-3 px-3 pt-3 border-t border-border mt-2">
              <a
                href="https://convex.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                <House size={16} />
              </a>
              <a
                href="https://docs.convex.dev/components"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                <FileTextIcon className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/get-convex"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                <GithubLogo size={16} />
              </a>
              <a
                href="https://discord.gg/convex"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                <DiscordLogo size={16} />
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
