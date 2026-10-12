import { NavList, NavListGroup, NavListItem } from "@altr/apolyx";
import { BarChart3, CreditCard, Home, Settings, Users } from "lucide-react";

export default function NavListDemo() {
  return (
    <div className="w-60 rounded-lg border border-border p-3">
      <NavList>
        <NavListGroup label="Workspace">
          <NavListItem href="#" active>
            <Home /> Overview
          </NavListItem>
          <NavListItem href="#">
            <BarChart3 /> Analytics
          </NavListItem>
          <NavListItem href="#">
            <Users /> Team
          </NavListItem>
        </NavListGroup>
        <NavListGroup label="Account">
          <NavListItem href="#">
            <Settings /> Settings
          </NavListItem>
          <NavListItem href="#" disabled>
            <CreditCard /> Billing
          </NavListItem>
        </NavListGroup>
      </NavList>
    </div>
  );
}
