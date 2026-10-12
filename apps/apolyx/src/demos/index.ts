import AlertDemo from "./alert-demo";
import AvatarDemo from "./avatar-demo";
import BadgeDemo from "./badge-demo";
import BarChartDemo from "./bar-chart-demo";
import BreadcrumbDemo from "./breadcrumb-demo";
import ButtonDemo from "./button-demo";
import CardDemo from "./card-demo";
import CheckboxDemo from "./checkbox-demo";
import DialogDemo from "./dialog-demo";
import DropdownMenuDemo from "./dropdown-menu-demo";
import FadeInDemo from "./fade-in-demo";
import FieldDemo from "./field-demo";
import GridDemo from "./grid-demo";
import HoverLiftDemo from "./hover-lift-demo";
import InputDemo from "./input-demo";
import KbdDemo from "./kbd-demo";
import LabelDemo from "./label-demo";
import LineChartDemo from "./line-chart-demo";
import ListDemo from "./list-demo";
import NavListDemo from "./nav-list-demo";
import NavigationMenuDemo from "./navigation-menu-demo";
import PressableDemo from "./pressable-demo";
import SeparatorDemo from "./separator-demo";
import SheetDemo from "./sheet-demo";
import SkeletonDemo from "./skeleton-demo";
import SpinnerDemo from "./spinner-demo";
import StaggerDemo from "./stagger-demo";
import SwitchDemo from "./switch-demo";
import TableDemo from "./table-demo";
import TabsDemo from "./tabs-demo";
import TextDemo from "./text-demo";
import TextareaDemo from "./textarea-demo";
import ToastDemo from "./toast-demo";
import TooltipDemo from "./tooltip-demo";

export const demos = {
  "alert-demo": AlertDemo,
  "avatar-demo": AvatarDemo,
  "badge-demo": BadgeDemo,
  "bar-chart-demo": BarChartDemo,
  "button-demo": ButtonDemo,
  "card-demo": CardDemo,
  "checkbox-demo": CheckboxDemo,
  "dialog-demo": DialogDemo,
  "dropdown-menu-demo": DropdownMenuDemo,
  "fade-in-demo": FadeInDemo,
  "hover-lift-demo": HoverLiftDemo,
  "input-demo": InputDemo,
  "kbd-demo": KbdDemo,
  "label-demo": LabelDemo,
  "line-chart-demo": LineChartDemo,
  "pressable-demo": PressableDemo,
  "separator-demo": SeparatorDemo,
  "skeleton-demo": SkeletonDemo,
  "spinner-demo": SpinnerDemo,
  "stagger-demo": StaggerDemo,
  "switch-demo": SwitchDemo,
  "tabs-demo": TabsDemo,
  "breadcrumb-demo": BreadcrumbDemo,
  "field-demo": FieldDemo,
  "grid-demo": GridDemo,
  "list-demo": ListDemo,
  "nav-list-demo": NavListDemo,
  "navigation-menu-demo": NavigationMenuDemo,
  "sheet-demo": SheetDemo,
  "table-demo": TableDemo,
  "text-demo": TextDemo,
  "textarea-demo": TextareaDemo,
  "toast-demo": ToastDemo,
  "tooltip-demo": TooltipDemo,
} as const;

export type DemoName = keyof typeof demos;
