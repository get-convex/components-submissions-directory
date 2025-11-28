// 404 Not Found page with isometric computer illustration
export default function NotFound() {
  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary px-4 py-8">
      {/* Isometric computer illustration */}
      <div className="w-full max-w-md mb-8">
        <svg
          viewBox="0 0 400 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          {/* Background pattern with dots */}
          <defs>
            <pattern
              id="dotPattern"
              x="0"
              y="0"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.8" fill="#DDD4C4" />
            </pattern>
          </defs>
          <rect width="400" height="300" fill="url(#dotPattern)" />

          {/* Desk surface with diagonal lines */}
          <path
            d="M0 220 L200 280 L400 220 L400 300 L0 300 Z"
            fill="#E8DCCA"
          />
          <path
            d="M0 220 L200 280 L400 220"
            stroke="#DDD4C4"
            strokeWidth="2"
            fill="none"
          />
          {/* Diagonal line pattern on desk */}
          <g opacity="0.3">
            <line x1="20" y1="240" x2="50" y2="250" stroke="#C5BAA8" strokeWidth="1" />
            <line x1="60" y1="250" x2="90" y2="260" stroke="#C5BAA8" strokeWidth="1" />
            <line x1="100" y1="260" x2="130" y2="270" stroke="#C5BAA8" strokeWidth="1" />
            <line x1="310" y1="240" x2="340" y2="230" stroke="#C5BAA8" strokeWidth="1" />
            <line x1="340" y1="250" x2="370" y2="240" stroke="#C5BAA8" strokeWidth="1" />
          </g>

          {/* Monitor stand */}
          <path
            d="M200 200 L220 210 L220 220 L180 220 L180 210 Z"
            fill="#2a2a2a"
          />
          <path
            d="M170 220 L230 220 L240 230 L160 230 Z"
            fill="#1a1a1a"
          />

          {/* Monitor body - isometric */}
          <path
            d="M100 80 L200 40 L300 80 L300 180 L200 220 L100 180 Z"
            fill="#1a1a1a"
            stroke="#2a2a2a"
            strokeWidth="2"
          />
          {/* Monitor screen */}
          <path
            d="M110 90 L200 55 L290 90 L290 170 L200 205 L110 170 Z"
            fill="#F7EEDB"
          />
          {/* Screen content - code lines */}
          <g opacity="0.4">
            <rect x="125" y="105" width="60" height="4" rx="2" fill="#DF5D34" />
            <rect x="125" y="115" width="80" height="4" rx="2" fill="#8b7355" />
            <rect x="125" y="125" width="45" height="4" rx="2" fill="#6b6b6b" />
            <rect x="125" y="135" width="70" height="4" rx="2" fill="#DF5D34" />
            <rect x="125" y="145" width="55" height="4" rx="2" fill="#8b7355" />
          </g>
          {/* Monitor accent strip on phone/side */}
          <path
            d="M300 80 L310 75 L310 175 L300 180 Z"
            fill="#DF5D34"
          />

          {/* Keyboard - isometric */}
          <path
            d="M120 235 L200 255 L280 235 L280 245 L200 265 L120 245 Z"
            fill="#F0E6D3"
            stroke="#DDD4C4"
            strokeWidth="1"
          />
          {/* Keyboard accent bottom edge */}
          <path
            d="M120 245 L200 265 L280 245 L280 250 L200 270 L120 250 Z"
            fill="#DF5D34"
          />
          {/* Keyboard keys */}
          <g opacity="0.6">
            <rect x="135" y="240" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(-20)" />
            <rect x="148" y="242" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(-20)" />
            <rect x="161" y="244" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(-20)" />
            <rect x="174" y="246" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(-20)" />
            <rect x="187" y="248" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(-20)" />
            <rect x="210" y="246" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(20)" />
            <rect x="223" y="244" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(20)" />
            <rect x="236" y="242" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(20)" />
            <rect x="249" y="240" width="6" height="4" rx="1" fill="#DDD4C4" transform="skewX(20)" />
          </g>

          {/* Mouse - isometric */}
          <path
            d="M320 240 L340 235 L350 245 L350 260 L340 270 L320 260 Z"
            fill="#F0E6D3"
            stroke="#DDD4C4"
            strokeWidth="1"
          />
          {/* Mouse accent button */}
          <path
            d="M325 245 L340 240 L345 245 L345 250 L340 255 L325 250 Z"
            fill="#DF5D34"
          />

          {/* Ruler/notepad on left */}
          <path
            d="M30 200 L60 210 L60 260 L30 250 Z"
            fill="#F0E6D3"
            stroke="#DDD4C4"
            strokeWidth="1"
          />
          {/* Ruler marks */}
          <g opacity="0.4">
            <line x1="35" y1="215" x2="55" y2="220" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="35" y1="225" x2="55" y2="230" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="35" y1="235" x2="55" y2="240" stroke="#1a1a1a" strokeWidth="1" />
          </g>

          {/* X marks in corner decoration */}
          <g opacity="0.2" stroke="#1a1a1a" strokeWidth="1">
            <path d="M350 60 L355 65 M355 60 L350 65" />
            <path d="M365 70 L370 75 M370 70 L365 75" />
            <path d="M370 55 L375 60 M375 55 L370 60" />
            <path d="M360 45 L365 50 M365 45 L360 50" />
          </g>
        </svg>
      </div>

      {/* Error message */}
      <div className="text-center max-w-md">
        <h1 className="text-6xl sm:text-7xl font-light text-text-primary mb-2">
          404
        </h1>
        <p className="text-xl sm:text-2xl text-text-secondary mb-2">
          not found
        </p>
        <p className="text-base sm:text-lg text-text-secondary mb-8">
          get back to building
        </p>

        {/* Home button */}
        <button
          onClick={handleGoHome}
          className="px-6 py-3 rounded-full text-base font-normal bg-button text-white hover:bg-button-hover transition-colors shadow-sm hover:shadow"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

