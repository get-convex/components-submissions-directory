// Promotional banner for Component Authoring
interface AuthoringBannerProps {
  className?: string;
}

export function AuthoringBanner({ className = "" }: AuthoringBannerProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ backgroundColor: "rgb(42, 40, 37)" }}
    >
      {/* Base dark gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(42,40,37,1) 0%, rgba(39,37,35,1) 50%, rgba(35,33,31,1) 100%)",
        }}
      />

      {/* Grid texture using an inline SVG data URL with higher visibility */}
      <div
        className="absolute inset-y-0 right-0 w-[60%]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='14' viewBox='0 0 12 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.5 14V0.5H12' stroke='%23888888' stroke-opacity='0.25'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "12px 14px",
        }}
      />

      {/* Fade the grid into the left text area */}
      <div
        className="absolute inset-y-0 left-0 w-[48%]"
        style={{
          background:
            "linear-gradient(90deg, rgba(42,40,37,1) 60%, rgba(42,40,37,0) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[120px] flex-col items-start justify-center gap-4 px-7 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-8">
        <div>
          <h2 className="mb-1 text-xl font-bold text-white sm:text-2xl">
            Component Authoring
          </h2>
          <p className="max-w-sm text-sm leading-snug text-[rgb(185,177,170)]">
            Build a reusable component for developers to drop into their
            projects.
          </p>
        </div>

        <a
          href="https://www.convex.dev/components/challenge"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110"
          style={{
            backgroundColor: "rgb(42, 40, 37)",
            border: "2px solid rgb(200, 50, 150)",
          }}
        >
          Learn more
        </a>
      </div>
    </section>
  );
}
