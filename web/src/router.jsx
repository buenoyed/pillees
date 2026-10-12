import { useEffect, useState } from "react";

const NAVIGATE = "pillees:navigate";

export const ROUTES = {
  "/": "board",
  "/capsules": "capsules",
  "/pools": "pools",
  "/protocol": "protocol",
  "/new": "new",
  "/sdk": "sdk",
  "/docs": "docs",
  "/run": "run",
};
export const PATH = Object.fromEntries(Object.entries(ROUTES).map(([path, view]) => [view, path]));

const clean = (pathname) => pathname.replace(/\/+$/, "") || "/";

// Old links were /#capsules. Move them to /capsules before anything renders.
export function upgradeHashRoute() {
  const id = window.location.hash.slice(1);
  if (clean(window.location.pathname) === "/" && PATH[id]) {
    window.history.replaceState(null, "", PATH[id]);
  }
}

export const isHome = () => clean(window.location.pathname) === "/";

export function navigate(to) {
  if (to !== window.location.pathname + window.location.hash) window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(NAVIGATE));
}

export function useView() {
  const read = () => ROUTES[clean(window.location.pathname)] ?? "board";
  const [view, setView] = useState(read);
  useEffect(() => {
    const sync = () => setView(read());
    window.addEventListener("popstate", sync);
    window.addEventListener(NAVIGATE, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(NAVIGATE, sync);
    };
  }, []);
  return view;
}

export function Link({ to, onClick, ...rest }) {
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
