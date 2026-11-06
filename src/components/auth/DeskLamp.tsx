import { motion } from "framer-motion";

interface DeskLampProps {
  on: boolean;
  onToggle: () => void;
}

/**
 * Pixar-style articulated desk lamp with a glowing bulb.
 * Desktop: sits bottom-left, head angled down-right so the beam lands on the form card.
 * Mobile: head hangs at the top shining straight down onto the card.
 * The SVG uses overflow:visible so the light beam can spill past the viewBox onto the card.
 */
const DeskLamp = ({ on, onToggle }: DeskLampProps) => {
  const glow = on ? 1 : 0;

  return (
    <>
      {/* ---------- Desktop / tablet lamp ---------- */}
      <svg
        viewBox="0 0 640 560"
        className="hidden md:block w-[min(44vw,600px)] max-w-none overflow-visible"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lampMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#464c59" />
            <stop offset="45%" stopColor="#22262e" />
            <stop offset="100%" stopColor="#14171c" />
          </linearGradient>
          <linearGradient
            id="beamGrad"
            gradientUnits="userSpaceOnUse"
            x1="398"
            y1="228"
            x2="975"
            y2="588"
          >
            <stop offset="0%" stopColor="#ffdca4" stopOpacity="0.5" />
            <stop offset="45%" stopColor="#ffdca4" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffdca4" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="bulbCore">
            <stop offset="0%" stopColor="#fff8ec" />
            <stop offset="55%" stopColor="#ffd9a0" />
            <stop offset="100%" stopColor="#ffb85c" stopOpacity="0.2" />
          </radialGradient>
          <filter id="beamBlur" filterUnits="userSpaceOnUse" x="300" y="100" width="900" height="800">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="softBlur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* floor shadow */}
        <ellipse cx="150" cy="492" rx="150" ry="20" fill="#000" opacity="0.55" filter="url(#softBlur)" />

        {/* light beam */}
        <g style={{ opacity: glow, transition: "opacity 0.8s ease" }} pointerEvents="none">
          <polygon points="398,228 1106,378 844,798" fill="url(#beamGrad)" filter="url(#beamBlur)" />
          <polygon
            points="398,228 980,368 830,700"
            fill="#ffe9c4"
            opacity="0.14"
            filter="url(#beamBlur)"
          />
        </g>

        {/* base */}
        <ellipse cx="150" cy="470" rx="112" ry="26" fill="url(#lampMetal)" stroke="#3a3f4a" strokeWidth="1.5" />
        <ellipse cx="150" cy="462" rx="96" ry="18" fill="#1c1f25" />

        {/* power switch on the base */}
        <g onClick={onToggle} className="cursor-pointer" role="button" aria-label="Toggle lamp">
          <circle cx="150" cy="456" r="26" fill="transparent" />
          <rect
            x="126"
            y="443"
            width="48"
            height="26"
            rx="13"
            fill={on ? "#3a2c14" : "#252930"}
            stroke={on ? "#ffb85c" : "#3a3f4a"}
            strokeWidth="1.5"
            style={{ transition: "fill 0.4s ease, stroke 0.4s ease" }}
          />
          <motion.circle
            fill={on ? "#ffd9a0" : "#565c68"}
            style={{ transition: "fill 0.4s ease" }}
            animate={{ cx: on ? 161 : 139 }}
            cy="456"
            r="9"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </g>

        {/* arms */}
        <path d="M150,462 L228,292" stroke="url(#lampMetal)" strokeWidth="16" strokeLinecap="round" />
        <circle cx="228" cy="292" r="17" fill="#2c3038" stroke="#3f4450" strokeWidth="2" />
        <path d="M228,292 L322,182" stroke="url(#lampMetal)" strokeWidth="13" strokeLinecap="round" />

        {/* head (cone pointing down-right) */}
        <g transform="rotate(32 322 182)">
          <path
            d="M292,154 L412,136 L412,224 L292,206 Z"
            fill="url(#lampMetal)"
            stroke="#3f4450"
            strokeWidth="1.5"
          />
          <ellipse cx="412" cy="180" rx="7" ry="45" fill="#101216" />
          {/* bulb glow halo */}
          <circle
            cx="402"
            cy="180"
            r="42"
            fill="#ffd9a0"
            opacity={glow * 0.45}
            filter="url(#softBlur)"
            style={{ transition: "opacity 0.8s ease" }}
          />
          <circle
            cx="402"
            cy="180"
            r="15"
            fill="url(#bulbCore)"
            opacity={0.25 + glow * 0.75}
            style={{ transition: "opacity 0.8s ease" }}
          />
        </g>

        {/* pull cord */}
        <g onClick={onToggle} className="cursor-pointer" role="button" aria-label="Pull cord">
          <path d="M406,250 q8,32 0,58" stroke="#5b616d" strokeWidth="2.5" fill="none" />
          <circle cx="406" cy="316" r="9" fill="none" stroke={on ? "#8b909a" : "#4a4f59"} strokeWidth="3" style={{ transition: "stroke 0.4s ease" }} />
          <circle cx="406" cy="314" r="20" fill="transparent" />
        </g>
      </svg>

      {/* ---------- Mobile lamp (head at top, shining down) ---------- */}
      <svg
        viewBox="0 0 420 320"
        className="md:hidden w-[min(78vw,340px)] overflow-visible mx-auto"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lampMetalM" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#464c59" />
            <stop offset="45%" stopColor="#22262e" />
            <stop offset="100%" stopColor="#14171c" />
          </linearGradient>
          <linearGradient id="beamGradM" gradientUnits="userSpaceOnUse" x1="210" y1="150" x2="210" y2="560">
            <stop offset="0%" stopColor="#ffdca4" stopOpacity="0.5" />
            <stop offset="45%" stopColor="#ffdca4" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffdca4" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="bulbCoreM">
            <stop offset="0%" stopColor="#fff8ec" />
            <stop offset="55%" stopColor="#ffd9a0" />
            <stop offset="100%" stopColor="#ffb85c" stopOpacity="0.2" />
          </radialGradient>
          <filter id="beamBlurM" filterUnits="userSpaceOnUse" x="-100" y="0" width="620" height="700">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="softBlurM" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* beam straight down onto the card */}
        <g style={{ opacity: glow, transition: "opacity 0.8s ease" }} pointerEvents="none">
          <polygon points="210,140 396,600 24,600" fill="url(#beamGradM)" filter="url(#beamBlurM)" />
        </g>

        {/* arm coming from top edge */}
        <path d="M60,-30 L206,66" stroke="#2f343d" strokeWidth="14" strokeLinecap="round" />
        <circle cx="206" cy="66" r="13" fill="#2c3038" stroke="#3f4450" strokeWidth="2" />

        {/* head pointing down */}
        <path d="M180,64 L240,64 L262,168 L158,168 Z" fill="#2a2e36" stroke="#4a505c" strokeWidth="1.5" />
        <ellipse cx="210" cy="168" rx="52" ry="7" fill="#101216" />
        <circle
          cx="210"
          cy="152"
          r="46"
          fill="#ffd9a0"
          opacity={glow * 0.4}
          filter="url(#softBlurM)"
          style={{ transition: "opacity 0.8s ease" }}
        />
        <circle
          cx="210"
          cy="152"
          r="15"
          fill="url(#bulbCoreM)"
          opacity={0.25 + glow * 0.75}
          style={{ transition: "opacity 0.8s ease" }}
        />

        {/* pull cord (also the toggle) */}
        <g onClick={onToggle} className="cursor-pointer" role="button" aria-label="Toggle lamp">
          <path d="M262,140 q12,34 2,64" stroke="#5b616d" strokeWidth="2.5" fill="none" />
          <circle cx="264" cy="212" r="9" fill="none" stroke={on ? "#8b909a" : "#4a4f59"} strokeWidth="3" style={{ transition: "stroke 0.4s ease" }} />
          <circle cx="264" cy="210" r="22" fill="transparent" />
        </g>
      </svg>
    </>
  );
};

export default DeskLamp;
