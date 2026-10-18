"use client";

import * as React from "react";
import {
  Bell,
  Check,
  Copy,
  DollarSign,
  Download,
  FileWarning,
  Funnel,
  Info,
  MapPin,
  MessageCircle,
  Search,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  Separator,
  Spinner,
  Textarea,
} from "@altr/apolyx";

function RatingsPanel() {
  const ratings = { 5: 225, 4: 30, 3: 30, 2: 15, 1: 0 };
  const total = Object.values(ratings).reduce((a, b) => a + b, 0);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Ratings">
          <Star className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex items-center gap-1">
          <span className="text-xl font-semibold">4.55</span>
          <Star className="size-5 fill-warning stroke-warning" />
        </div>
        <p className="mt-1 text-sm font-medium">Total {total} reviews</p>
        <PopoverDescription className="mt-1">
          All reviews are from verified customers.
        </PopoverDescription>
        <div className="mt-3 flex items-center justify-between">
          <Badge variant="secondary">+6 this week</Badge>
          <button type="button" className="text-sm hover:underline">
            See all
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {Object.entries(ratings).map(([star, count]) => (
            <li key={star} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0">{star} star</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-warning"
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-end">{count}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function PricingPanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Pricing">
          <DollarSign className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex items-center justify-between gap-2">
          <PopoverTitle>Enterprise</PopoverTitle>
          <span className="text-sm font-medium">$49.99/mo</span>
        </div>
        <PopoverDescription className="mt-2">
          Unlimited seats, priority support, and custom branding for your team.
        </PopoverDescription>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="destructive">Limited</Badge>
          <span className="text-xs text-muted-foreground">20% off annual</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VolumePanel() {
  const [value, setValue] = React.useState(45);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Volume">
          <Volume2 className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex items-center justify-between gap-2">
          <Label>Volume</Label>
          <output className="text-sm font-medium tabular-nums">{value}</output>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <VolumeX className="size-4 shrink-0 opacity-60" />
          <Input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label="Volume"
            className="flex-1"
          />
          <Volume2 className="size-4 shrink-0 opacity-60" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AboutPanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="About">
          <Info className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3 text-center">
          <PopoverTitle>About Apolyx</PopoverTitle>
          <PopoverDescription>
            Owned primitives, three theme families, and motion that respects reduced motion.
          </PopoverDescription>
          <Button size="sm" asChild>
            <a href="/docs">Learn more</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DownloadPanel() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (!open || paused || value >= 100) return;
    const id = window.setInterval(() => {
      setValue((v) => Math.min(100, v + 8));
    }, 400);
    return () => window.clearInterval(id);
  }, [open, paused, value]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValue(0);
          setPaused(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Download">
          <Download className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex items-center gap-2">
          {value < 100 ? <Spinner className="size-4" /> : <Check className="size-4 text-success" />}
          <span className="flex-1 text-sm font-medium">
            {value >= 100 ? "Download complete" : paused ? "Paused" : "Downloading file"}
          </span>
          <span className="text-sm font-semibold tabular-nums">{value}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${value}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" disabled={value >= 100} onClick={() => setPaused((p) => !p)}>
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DeletePanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Delete file">
          <FileWarning className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <FileWarning className="size-6 text-destructive" />
          </div>
          <PopoverTitle>Delete this file?</PopoverTitle>
          <PopoverDescription>
            This can break links in your project. Prefer Archive when you are unsure.
          </PopoverDescription>
          <div className="grid w-full grid-cols-2 gap-2">
            <PopoverClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </PopoverClose>
            <PopoverClose asChild>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </PopoverClose>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FeedbackPanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Feedback">
          <MessageCircle className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <PopoverTitle>Feedback</PopoverTitle>
        <Textarea placeholder="What should we improve?" className="mt-2 max-h-40" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <PopoverClose asChild>
            <Button size="sm">Send</Button>
          </PopoverClose>
          <PopoverClose asChild>
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterPanel() {
  const filters = ["Most liked", "Highest reviewed", "Newest", "Most popular"];
  const [selected, setSelected] = React.useState(["Most liked", "Newest"]);
  const [price, setPrice] = React.useState(450);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Filter">
          <Funnel className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center justify-between gap-2">
          <PopoverTitle>Filter</PopoverTitle>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 rounded-full px-2 text-xs"
            onClick={() => {
              setSelected(["Most liked", "Newest"]);
              setPrice(450);
            }}
          >
            Reset
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {filters.map((label) => (
            <li key={label} className="flex items-center gap-2">
              <Checkbox
                id={`filter-${label}`}
                checked={selected.includes(label)}
                onCheckedChange={(checked) => {
                  setSelected((prev) =>
                    checked === true
                      ? [...prev, label]
                      : prev.filter((x) => x !== label),
                  );
                }}
              />
              <Label htmlFor={`filter-${label}`}>{label}</Label>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Price up to</span>
            <output className="tabular-nums">${price}</output>
          </div>
          <Input
            type="range"
            min={50}
            max={1000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            aria-label="Price"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SearchPanel() {
  const users = [
    { name: "Howard Lloyd", fallback: "HL", notes: 3 },
    { name: "Olivia Sparks", fallback: "OS" },
    { name: "Hallie Richards", fallback: "HR", notes: 1 },
  ];
  const [query, setQuery] = React.useState("");
  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Search people">
          <Search className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="border-b border-border p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            aria-label="Search people"
          />
        </div>
        <ul className="max-h-48 overflow-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-sm text-muted-foreground">
              No matches
            </li>
          ) : (
            filtered.map((user) => (
              <li key={user.name}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent-hover"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{user.fallback}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1">{user.name}</span>
                  {user.notes ? (
                    <Badge variant="secondary" className="rounded-sm">
                      {user.notes}
                    </Badge>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function NotificationsPanel() {
  const items = [
    { fallback: "HL", message: "Harry assigned you New API implementation", time: "15m" },
    { fallback: "OS", message: "Jerry joined the team", time: "35m" },
    { fallback: "HR", message: "Congratulate Ruby", time: "3d" },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <PopoverTitle>Notifications</PopoverTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Mark all read
          </Button>
        </div>
        <ul>
          {items.map((item, i) => (
            <li key={item.message}>
              {i > 0 ? <Separator /> : null}
              <div className="flex gap-3 px-4 py-3">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{item.fallback}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{item.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
                </div>
                <span className="mt-1 size-2 shrink-0 self-start rounded-full bg-primary" />
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function MediaPanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Place">
          <MapPin className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-85 overflow-hidden p-0">
        <div className="flex">
          <div className="space-y-2 p-4">
            <PopoverTitle>Alborz range</PopoverTitle>
            <PopoverDescription className="text-xs">
              A mountain chain north of Tehran — peaks, trails, and winter snow.
            </PopoverDescription>
            <a href="#" className="inline-flex text-xs hover:underline">
              Read more
            </a>
          </div>
          <div className="w-2/5 shrink-0 bg-gradient-to-br from-muted to-primary/20" aria-hidden />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CouponPanel() {
  const [copied, setCopied] = React.useState(false);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Slide · coupon</Button>
      </PopoverTrigger>
      <PopoverContent motion="slide" side="left" className="w-80">
        <div className="flex flex-col items-center gap-3 text-center">
          <PopoverTitle>Summer sale</PopoverTitle>
          <PopoverDescription>Scan at checkout for 25% off.</PopoverDescription>
          <div className="flex size-36 items-center justify-center rounded-xl border border-border bg-muted text-xs text-muted-foreground">
            QR placeholder
          </div>
          <div className="flex w-full items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or code</span>
            <Separator className="flex-1" />
          </div>
          <div className="flex w-full gap-2">
            <Input defaultValue="SUMMER25OFF" readOnly className="h-8 font-mono text-xs" />
            <Button
              size="sm"
              variant="secondary"
              aria-label="Copy code"
              onClick={async () => {
                await navigator.clipboard.writeText("SUMMER25OFF");
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SharePanel() {
  const members = [
    { name: "Howard Lloyd", role: "Product", fallback: "HL" },
    { name: "Olivia Sparks", role: "Engineer", fallback: "OS" },
    { name: "Hallie Richards", role: "Design", fallback: "HR" },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Slide · share</Button>
      </PopoverTrigger>
      <PopoverContent motion="slide" side="bottom" className="w-80">
        <PopoverTitle>Share with the team</PopoverTitle>
        <PopoverDescription className="mt-1">
          Invite collaborators to this project.
        </PopoverDescription>
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="share-email" className="text-xs font-normal text-muted-foreground">
            Email
          </Label>
          <div className="flex gap-2">
            <Input id="share-email" type="email" placeholder="name@company.com" className="h-8" />
            <Button size="sm">Invite</Button>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {members.map((m, i) => (
            <li key={m.name} className="flex items-center gap-2">
              <Checkbox id={`member-${i}`} />
              <Label htmlFor={`member-${i}`} className="flex flex-1 items-center gap-2 font-normal">
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px]">{m.fallback}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.role}</span>
              </Label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function ProfilePanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Profile</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar className="size-16">
            <AvatarFallback>HL</AvatarFallback>
          </Avatar>
          <PopoverTitle className="text-lg">Howard Lloyd</PopoverTitle>
          <span className="text-sm text-muted-foreground">@iamhoward</span>
          <div className="my-1 h-px w-40 bg-gradient-to-r from-transparent via-border to-transparent" />
          <PopoverDescription className="italic">
            Product lead building tools that stay out of the way.
          </PopoverDescription>
          <div className="mt-1 flex gap-4 text-sm">
            <span>
              <strong>512</strong>{" "}
              <span className="font-normal text-muted-foreground">followers</span>
            </span>
            <span>
              <strong>128</strong>{" "}
              <span className="font-normal text-muted-foreground">following</span>
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HoverPanel() {
  return (
    <Popover trigger="hover">
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Hover info">
          <Info className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Hover trigger</PopoverTitle>
        <PopoverDescription className="mt-1">
          Opens after 120ms and stays open while you cross into the panel.
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}

export default function PopoverPanelsDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RatingsPanel />
      <PricingPanel />
      <VolumePanel />
      <AboutPanel />
      <DownloadPanel />
      <DeletePanel />
      <FeedbackPanel />
      <FilterPanel />
      <SearchPanel />
      <NotificationsPanel />
      <MediaPanel />
      <CouponPanel />
      <SharePanel />
      <ProfilePanel />
      <HoverPanel />
    </div>
  );
}
