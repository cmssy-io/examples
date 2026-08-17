import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from "react-router";

interface LocaleData {
  locale?: string;
  defaultLocale?: string;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const matches = useMatches();
  const data = matches.reduce<LocaleData>(
    (found, match) => (match.loaderData as LocaleData | undefined) ?? found,
    {},
  );

  return (
    <html lang={data.locale ?? data.defaultLocale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
