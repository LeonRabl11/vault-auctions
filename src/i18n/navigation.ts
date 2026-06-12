import {createNavigation} from "next-intl/navigation";
import {routing} from "./routing";

// Locale-bewusste Navigations-APIs (für z. B. den Sprach-Umschalter)
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
