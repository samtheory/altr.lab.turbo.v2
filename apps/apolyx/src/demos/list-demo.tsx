import {
  Avatar,
  AvatarFallback,
  Badge,
  List,
  ListItem,
  ListItemContent,
  ListItemDescription,
  ListItemLeading,
  ListItemTitle,
  ListItemTrailing,
} from "@altr/apolyx";
import { ChevronRight } from "lucide-react";

const people = [
  { name: "Ada Lovelace", role: "Engineering", initials: "AL", tasks: 4 },
  { name: "Grace Hopper", role: "Platform", initials: "GH", tasks: 9 },
  { name: "Alan Turing", role: "Research", initials: "AT", tasks: 2 },
];

export default function ListDemo() {
  return (
    <List variant="divided" className="w-full max-w-sm">
      {people.map((p) => (
        <ListItem key={p.name} asChild>
          <a href="#">
            <ListItemLeading>
              <Avatar className="size-8">
                <AvatarFallback>{p.initials}</AvatarFallback>
              </Avatar>
            </ListItemLeading>
            <ListItemContent>
              <ListItemTitle>{p.name}</ListItemTitle>
              <ListItemDescription>{p.role}</ListItemDescription>
            </ListItemContent>
            <ListItemTrailing>
              <Badge variant="secondary">{p.tasks}</Badge>
              <ChevronRight className="size-4" />
            </ListItemTrailing>
          </a>
        </ListItem>
      ))}
    </List>
  );
}
