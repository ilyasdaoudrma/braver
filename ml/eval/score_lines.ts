// Debug helper: on-device safety level, score and zone for each argument line.
// Usage: npx jiti ml/eval/score_lines.ts "line 1" "line 2"
import { readFileSync } from "node:fs";
import { prepareModel, type CharModel } from "../../lib/charmodel";
import { checkSafety, type SafetyModel } from "../../lib/safety/pipeline";
import { zoneOnDevice } from "../../lib/zones/model";

const safety = prepareModel(JSON.parse(readFileSync("public/models/safety.json", "utf-8")) as SafetyModel);
const zones = prepareModel(JSON.parse(readFileSync("public/models/zones.json", "utf-8")) as CharModel);
for (const line of process.argv.slice(2)) {
  const s = checkSafety(line, safety);
  console.log(`${s.level.padEnd(8)} ${s.score?.toFixed(3) ?? "-"}  ${zoneOnDevice(line, zones).zone.padEnd(11)} ${line}`);
}
