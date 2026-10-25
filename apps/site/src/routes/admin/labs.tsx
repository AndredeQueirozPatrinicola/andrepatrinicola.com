import { PageHeader } from "../../features/admin/AdminShell";
import { LiveLab } from "../../features/queue-lab/live/LiveLab";

import "../../features/queue-lab/queue-lab.css";

export function meta() {
  return [{ title: "Labs · Portfolio Studio" }];
}

export default function AdminLabsRoute() {
  return (
    <>
      <PageHeader title="Labs" description="Distributed Systems Playground: o experimento com Amazon SQS rodando na AWS." />
      <LiveLab />
    </>
  );
}
