import { createRouter } from "@tanstack/react-router";
import { RoutePending } from "@/components/page-loading";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 120,
    defaultPendingMinMs: 240,
  });
}
