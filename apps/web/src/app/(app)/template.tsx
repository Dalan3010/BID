import type { ReactNode } from "react";

import { RouteTransition } from "@/components/motion/route-transition";

/**
 * Re-mounted by Next.js on every navigation inside the studio, so each
 * section arrives with the same soft transition.
 */
export default function StudioTemplate({ children }: { children: ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
