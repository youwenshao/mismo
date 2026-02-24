import { DEMO_PRD } from "./demo-data";
import PRDEditor from "./prd-editor";

export default function PRDPage() {
  return <PRDEditor prd={DEMO_PRD} />;
}
