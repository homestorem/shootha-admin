import type { NavigationState, PartialState } from "@react-navigation/native";

export function getDeepestRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined
): string | undefined {
  if (!state || state.index == null || !state.routes?.length) return undefined;
  const route = state.routes[state.index];
  if (route.state) {
    return getDeepestRouteName(route.state as NavigationState) ?? route.name;
  }
  return route.name as string | undefined;
}
