// JSON-lines-free batch transport for parity tests; no network dependency.
import {createSpglibBridge} from '../dist/vendor/spglib/bridge.mjs';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const run = await createSpglibBridge();
process.stdout.write(JSON.stringify(JSON.parse(input).map(request => JSON.parse(run(JSON.stringify(request))))));
