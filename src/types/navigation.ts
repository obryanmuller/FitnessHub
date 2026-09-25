export type NavigationIcon = "home" | "meals" | "workouts" | "progress" | "profile";

export type NavigationItem = {
  label: string;
  icon: NavigationIcon;
  href: string;
  active?: boolean;
  disabled?: boolean;
};
