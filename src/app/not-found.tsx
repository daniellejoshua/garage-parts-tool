import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/app/page-heading";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Page not found" />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            The page you requested does not exist. The brand or model may not be
            part of the GAP vehicle reference catalog.
          </p>
          <Button render={<Link href="/" />}>Back to overview</Button>
        </CardContent>
      </Card>
    </div>
  );
}