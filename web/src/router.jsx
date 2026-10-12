import { useEffect, useState } from "react";

const NAVIGATE = "pillees:navigate";

export const ROUTES = {
  "/": "home",
  "/markets": "markets",
  "/leaderboard": "leaderboard",
  "/launch": "launch",
  "/protocol": "protocol",
  "/profile": "profile",
  "/sdk": "sdk",
  "/docs": "docs",
  "/run": "run",
};
export const PATH = Object.fromEntries(Object.entries(ROUTES).map(([path, view]) => [view, path]));

const clean = (pathname) => pathname.replace(/\/+$/, "") || "/";

// Old links were /#protocol. Move them to /protocol before anything renders.
export function upgradeHashRoute() {
  const id = window.location.hash.slice(1);
  if (clean(window.location.pathname) === "/" && PATH[id]) {
    window.history.replaceState(null, "", PATH[id]);
  }
}

export const isHome = () => clean(window.location.pathname) === "/";

export function navigate(to) {
  if (to !== window.location.pathname + window.location.search) window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(NAVIGATE));
}

function read() {
  const path = clean(window.location.pathname);
  const bot = /^\/bots\/([\w-]+)(\/coin)?$/.exec(path);
  if (bot) return { view: bot[2] ? "coin" : "bot", id: bot[1] };
  const profile = /^\/profile\/([1-9A-HJ-NP-Za-km-z]{32,44})$/.exec(path);
  if (profile) return { view: "profile", id: profile[1] };
  return { view: ROUTES[path] ?? "home" };
}

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const sync = () => setRoute(read());
    window.addEventListener("popstate", sync);
    window.addEventListener(NAVIGATE, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(NAVIGATE, sync);
    };
  }, []);
  return route;
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
