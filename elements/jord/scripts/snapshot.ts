#!/usr/bin/env node
import { snapshotDatabase } from "../src/snapshot.js";

const dest = await snapshotDatabase();
console.log(`[@altr/jord] snapshot written: ${dest}`);
