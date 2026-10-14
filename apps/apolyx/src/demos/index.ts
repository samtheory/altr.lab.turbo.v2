import AlertDemo from "./alert-demo";
import AvatarDemo from "./avatar-demo";
import BadgeDemo from "./badge-demo";
import BarChartDemo from "./bar-chart-demo";
import ButtonDemo from "./button-demo";
import CardDemo from "./card-demo";
import CheckboxDemo from "./checkbox-demo";
import DialogDemo from "./dialog-demo";
import DropdownMenuDemo from "./dropdown-menu-demo";
import FadeInDemo from "./fade-in-demo";
import HoverLiftDemo from "./hover-lift-demo";
import InputDemo from "./input-demo";
import KbdDemo from "./kbd-demo";
import LabelDemo from "./label-demo";
import LineChartDemo from "./line-chart-demo";
import PressableDemo from "./pressable-demo";
import SeparatorDemo from "./separator-demo";
import SkeletonDemo from "./skeleton-demo";
import SpinnerDemo from "./spinner-demo";
import StaggerDemo from "./stagger-demo";
import SwitchDemo from "./switch-demo";
import TabsDemo from "./tabs-demo";
import TextDemo from "./text-demo";
import TextareaDemo from "./textarea-demo";
import TimelineAlternateDemo from "./timeline-alternate-demo";
import TimelineDemo from "./timeline-demo";
import TimelineHorizontalDemo from "./timeline-horizontal-demo";
import TimelineIconsDemo from "./timeline-icons-demo";
import TimelinePipelineDemo from "./timeline-pipeline-demo";
import TimelineProgressDemo from "./timeline-progress-demo";
import TimelineRoadmapDemo from "./timeline-roadmap-demo";
import TimelineSplitDemo from "./timeline-split-demo";
import TimelineStatusDemo from "./timeline-status-demo";
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
  "text-demo": TextDemo,
  "textarea-demo": TextareaDemo,
  "timeline-alternate-demo": TimelineAlternateDemo,
  "timeline-demo": TimelineDemo,
  "timeline-horizontal-demo": TimelineHorizontalDemo,
  "timeline-icons-demo": TimelineIconsDemo,
  "timeline-pipeline-demo": TimelinePipelineDemo,
  "timeline-progress-demo": TimelineProgressDemo,
  "timeline-roadmap-demo": TimelineRoadmapDemo,
  "timeline-split-demo": TimelineSplitDemo,
  "timeline-status-demo": TimelineStatusDemo,
  "toast-demo": ToastDemo,
  "tooltip-demo": TooltipDemo,
} as const;

export type DemoName = keyof typeof demos;
