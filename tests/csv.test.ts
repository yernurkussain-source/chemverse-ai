import assert from "node:assert/strict";
import { test } from "node:test";
import { toCsv } from "@/lib/csv";

test("CSV: BOM, «;» бөлгіші, тырнақшалар және формула инъекциясынан қорғау", () => {
  const csv = toCsv([
    ["Аты", "XP"],
    ["Әлия; Нұр", 120],
    ['=HYPERLINK("x")', null],
    ["Ерлан", 0],
  ]);
  assert.ok(csv.startsWith("﻿"));
  const lines = csv.slice(1).split("\r\n");
  assert.deepEqual(lines, ["Аты;XP", '"Әлия; Нұр";120', `"'=HYPERLINK(""x"")";`, "Ерлан;0"]);
});
