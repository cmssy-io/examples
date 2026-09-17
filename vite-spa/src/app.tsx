import { useEffect, useState } from "react";
import { CmssyRoute } from "@cmssy/react/spa";
import { cmssy } from "./cmssy.config";
import { blocks } from "./cmssy/blocks";

function useLocation(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

export function App() {
  const path = useLocation();

  return (
    <CmssyRoute
      config={cmssy}
      blocks={blocks}
      path={path}
      fallback={<p className="notice">Loading…</p>}
      notFound={
        <main className="notice">
          <h1>Not found</h1>
          <p>The workspace publishes no page at {path}.</p>
        </main>
      }
      renderError={(error) => (
        <main className="notice">
          <h1>The workspace did not answer</h1>
          <p>{error.message}</p>
        </main>
      )}
    >
      {({ Region, Blocks }) => (
        <>
          <Region id="header" />
          <main>
            <Blocks />
          </main>
          <Region id="footer" />
        </>
      )}
    </CmssyRoute>
  );
}
