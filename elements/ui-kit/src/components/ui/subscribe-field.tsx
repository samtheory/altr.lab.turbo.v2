"use client";

import * as React from "react";
import { AnimatePresence, MotionConfig, motion, useInView, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";
import { easings } from "../../motion/tokens";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

export type SubscribeAvatar = {
  initials: string;
  photo?: string;
};

type Person = SubscribeAvatar & { id: number };

const DEFAULT_AVATARS: SubscribeAvatar[] = [
  { initials: "MT" },
  { initials: "AC" },
  { initials: "SL" },
  { initials: "JN" },
  { initials: "KP" },
  { initials: "LH" },
  { initials: "RD" },
  { initials: "VB" },
];

function RollingDigit({ digit }: { digit: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex h-[1em] w-[0.62em] justify-center overflow-hidden leading-none">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={reduce ? false : { y: "100%", opacity: 0, filter: "blur(2px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={reduce ? undefined : { y: "-100%", opacity: 0, filter: "blur(2px)" }}
          transition={{ duration: 0.45, ease: easings.out, delay: reduce ? 0 : 0.2 }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function RollingNumber({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className="inline-flex tabular-nums" aria-live="polite" aria-label={String(value)}>
      {digits.map((d, i) => (
        <RollingDigit key={`${digits.length}-${i}`} digit={d} />
      ))}
    </span>
  );
}

export type SubscribeFieldProps = {
  placeholder?: string;
  buttonLabel?: React.ReactNode;
  joinedLabel?: React.ReactNode;
  countLabel?: React.ReactNode;
  count?: number;
  defaultCount?: number;
  avatars?: SubscribeAvatar[];
  visibleAvatars?: number;
  selfInitials?: string;
  /** Add a simulated joiner while the field is on screen. */
  simulate?: boolean;
  interval?: number;
  id?: string;
  onSubmit?: (email: string) => void;
  className?: string;
};

/** Email subscribe / waitlist field with a live avatar stack and rolling join counter. */
export function SubscribeField({
  placeholder = "Enter your email",
  buttonLabel = "Subscribe",
  joinedLabel = "You're in",
  countLabel = "People joined today",
  count: countProp,
  defaultCount = 180,
  avatars = DEFAULT_AVATARS,
  visibleAvatars = 5,
  selfInitials = "You",
  simulate = true,
  interval = 2200,
  id = "subscribe-email",
  onSubmit,
  className,
}: SubscribeFieldProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const [innerCount, setCount] = React.useState(defaultCount);
  const count = countProp ?? innerCount;
  const personAt = React.useCallback(
    (pid: number): Person => ({ id: pid, ...avatars[pid % Math.max(avatars.length, 1)] }),
    [avatars],
  );
  const [people, setPeople] = React.useState<Person[]>(() =>
    avatars.length
      ? Array.from({ length: Math.min(visibleAvatars, avatars.length) }, (_, i) =>
          personAt(visibleAvatars - 1 - i),
        )
      : [],
  );
  const [joined, setJoined] = React.useState(false);
  const nextId = React.useRef(visibleAvatars);

  const addPerson = React.useCallback(
    (person: Person) => {
      setPeople((list) => [person, ...list].slice(0, visibleAvatars));
      if (countProp === undefined) setCount((c) => c + 1);
    },
    [countProp, visibleAvatars],
  );

  React.useEffect(() => {
    if (!inView || !simulate || !avatars.length) return;
    const timer = window.setInterval(() => {
      addPerson(personAt(nextId.current++));
    }, interval);
    return () => window.clearInterval(timer);
  }, [inView, simulate, interval, avatars.length, addPerson, personAt]);

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} data-slot="subscribe-field" className={cn("grid w-full max-w-md gap-4", className)}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (joined) return;
            setJoined(true);
            addPerson({ id: nextId.current++, initials: selfInitials });
            onSubmit?.(String(new FormData(e.currentTarget).get("email") ?? ""));
          }}
        >
          <Label htmlFor={id} className="sr-only">
            Email
          </Label>
          <Input
            id={id}
            name="email"
            type="email"
            required
            placeholder={placeholder}
            disabled={joined}
            className="h-10 flex-1"
          />
          <Button type="submit" className="h-10 px-5" disabled={joined}>
            {joined ? joinedLabel : buttonLabel}
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center pl-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {people.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.6, x: -10, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.8, x: 18, filter: "blur(2px)" }}
                  transition={{ duration: 0.55, ease: easings.out }}
                  className="-ml-2"
                >
                  <Avatar className="size-7 ring-2 ring-background">
                    {p.photo ? <AvatarImage src={p.photo} alt="" /> : null}
                    <AvatarFallback className="text-[10px] font-medium">{p.initials}</AvatarFallback>
                  </Avatar>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="relative z-10 flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-3 pl-0.5 text-xs">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-background">
              <RollingNumber value={count} />
            </span>
            <span className="text-muted-foreground">{countLabel}</span>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
