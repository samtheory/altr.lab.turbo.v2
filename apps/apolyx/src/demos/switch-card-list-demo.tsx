"use client";

import { Cloud, Mail, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  List,
  ListItem,
  ListItemContent,
  ListItemDescription,
  ListItemLeading,
  ListItemTitle,
  ListItemTrailing,
  Switch,
} from "@altr/apolyx";

const channels = [
  { id: "email", icon: Mail, title: "Email", description: "Daily summary to ada@apolyx.dev", on: true },
  { id: "mobile", icon: Smartphone, title: "Mobile push", description: "iPhone 15 · last seen today", on: true },
  { id: "backup", icon: Cloud, title: "Cloud backup", description: "Nightly at 02:00", on: false },
];

export default function SwitchCardListDemo() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Channels</CardTitle>
        <CardDescription>Where Apolyx can reach you.</CardDescription>
      </CardHeader>
      <CardContent>
        <List variant="divided">
          {channels.map((c) => (
            <ListItem key={c.id}>
              <ListItemLeading>
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <c.icon className="size-4" aria-hidden />
                </span>
              </ListItemLeading>
              <ListItemContent>
                <ListItemTitle id={`ch-${c.id}`}>{c.title}</ListItemTitle>
                <ListItemDescription>{c.description}</ListItemDescription>
              </ListItemContent>
              <ListItemTrailing>
                <Switch aria-labelledby={`ch-${c.id}`} size="sm" defaultChecked={c.on} />
              </ListItemTrailing>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
