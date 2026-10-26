import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  LogOut,
  Plus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

// Стримані лінійні іконки lucide — лише цей набір, завжди поруч із підписом (DESIGN.md, розділ 5): однаковий розмір і
// товщина, aria-hidden — сенс несе текст.
function icon(Glyph: LucideIcon) {
  return function UiIcon() {
    return <Glyph aria-hidden size={16} strokeWidth={1.9} className="shrink-0" />;
  };
}

export const SlotsIcon = icon(CalendarDays);
export const ClientsIcon = icon(Users);
export const SignOutIcon = icon(LogOut);
export const AddIcon = icon(Plus);
export const BackIcon = icon(ChevronLeft);
export const PreviousIcon = icon(ChevronLeft);
export const NextIcon = icon(ChevronRight);
export const AlertIcon = icon(CircleAlert);
export const TimeIcon = icon(Clock);
export const ClientIcon = icon(UserRound);
