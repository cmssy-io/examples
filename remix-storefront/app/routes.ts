import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

function shop(path: string, file: string) {
  return [
    route(path, file),
    route(`:locale/${path}`, file, { id: `localized/${path}` }),
  ];
}

// The splat does not match "/", so the homepage needs its own entry - it is the
// same route module, mounted twice.
export default [
  route("sitemap.xml", "routes/sitemap.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("api/cmssy/block-data", "routes/block-data.ts"),
  route("api/cart", "routes/api-cart.ts"),
  route("api/auth", "routes/api-auth.ts"),
  route("api/stripe/webhook", "routes/stripe-webhook.ts"),
  layout("routes/shop-layout.tsx", [
    ...shop("c/:slug", "routes/catalog.tsx"),
    ...shop("p/:slug", "routes/product.tsx"),
    ...shop("cart", "routes/cart.tsx"),
    ...shop("account", "routes/account.tsx"),
    ...shop("order/:id", "routes/order.tsx"),
    ...shop("quick-order", "routes/quick-order.tsx"),
  ]),
  index("routes/page.tsx"),
  route("*", "routes/page.tsx", { id: "cmssy-catch-all" }),
] satisfies RouteConfig;
