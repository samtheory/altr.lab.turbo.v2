"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@altr/apolyx";

export default function AccordionDemo() {
  return (
    <Accordion type="single" collapsible className="w-full max-w-md" defaultValue="schema">
      <AccordionItem value="schema">
        <AccordionTrigger>Schema</AccordionTrigger>
        <AccordionContent>
          Browse tables and columns. Live save runs migrations through Jord.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="jobs">
        <AccordionTrigger>Jobs</AccordionTrigger>
        <AccordionContent>Schedule cron jobs and inspect last / next / failure.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="apis">
        <AccordionTrigger>APIs</AccordionTrigger>
        <AccordionContent>Generated CRUD and custom function endpoints.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
