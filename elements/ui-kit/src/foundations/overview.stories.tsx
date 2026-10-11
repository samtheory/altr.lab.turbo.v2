import type { Meta, StoryObj } from "@storybook/react-vite";

import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Kbd, KbdGroup } from "../components/ui/kbd";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { Toaster, toast } from "../components/ui/toast";

function OverviewScreen() {
  return (
    <div className="w-[420px] max-w-full space-y-4 text-left">
      <Toaster />
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Apolyx</p>
          <h2 className="font-display text-2xl font-semibold">Wave 1 form</h2>
        </div>
        <Badge variant="info">preview</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h3">Profile</CardTitle>
          <CardDescription>Semantic tokens only — swap families in the toolbar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Ada Lovelace" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Short note" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="terms" defaultChecked />
            <Label htmlFor="terms">Accept terms</Label>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="notify">Email digests</Label>
            <Switch id="notify" />
          </div>
          <Separator />
          <Alert variant="success">
            <AlertTitle>Ready</AlertTitle>
            <AlertDescription>All controls use shared tokens.</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>S</Kbd>
          </KbdGroup>
          <div className="flex gap-2">
            <Button variant="outline">Cancel</Button>
            <Button onClick={() => toast.success("Profile saved")}>Save</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

const meta = {
  title: "Foundations/Overview",
  component: OverviewScreen,
  tags: ["autodocs"],
} satisfies Meta<typeof OverviewScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PowerBlueDarkHint: Story = {
  name: "Themes (use toolbar)",
  parameters: {
    docs: {
      description: {
        story: "Flip Theme + Mode in the Storybook toolbar to review all 6 palettes.",
      },
    },
  },
};
