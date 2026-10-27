import { useLocation } from "react-router";

/** Exposes the router location to tests that follow links. */
export function RouteLocation() {
  const location = useLocation();
  return (
    <output hidden data-testid="route-location">
      {location.pathname}
      {location.search}
    </output>
  );
}
