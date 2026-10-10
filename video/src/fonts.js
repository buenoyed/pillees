import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexMono";

export const DISPLAY = loadBricolage("normal", { weights: ["600", "700", "800"], subsets: ["latin"] }).fontFamily;
export const SANS = loadOutfit("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
export const MONO = loadPlex("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
