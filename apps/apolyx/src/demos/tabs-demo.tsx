"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@altr/apolyx";

export default function TabsDemo() {
  return (
    <Tabs defaultValue="overview" className="w-full max-w-md">
      <TabsList aria-label="Project sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-sm text-muted-foreground">
        Twelve deployments this week, all green.
      </TabsContent>
      <TabsContent value="activity" className="text-sm text-muted-foreground">
        Ada merged “Add tooltip delay group” two hours ago.
      </TabsContent>
      <TabsContent value="settings" className="text-sm text-muted-foreground">
        Builds run on every push to main.
      </TabsContent>
    </Tabs>
  );
}
