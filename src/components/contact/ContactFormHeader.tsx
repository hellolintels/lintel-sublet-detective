
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ContactFormHeader() {
  return (
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold mb-4">Request a Sample Report</DialogTitle>
      <DialogDescription className="text-muted-foreground">
        Upload address and postcodes to get a report on potential short term lettings.
      </DialogDescription>
    </DialogHeader>
  );
}
