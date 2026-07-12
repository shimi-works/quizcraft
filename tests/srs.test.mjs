// SRS（Leitner式）純関数の検証。index.html からマーカーで括ったブロックを抽出してNodeで実行する
// （hoshi-mado tests/astro.test.mjs と同じ仕組み）
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "index.html"), "utf-8");

function extract(startMark, endMark) {
  const s = html.indexOf(startMark);
  const e = html.indexOf(endMark);
  if (s === -1 || e === -1) throw new Error(`marker not found: ${startMark}`);
  return html.slice(s + startMark.length, e);
}

const src = extract("// ==SRS-START==", "// ==SRS-END==");
const { srsToday, srsAddDays, srsNewCard, srsGrade, srsQueue, SRS_INTERVALS, SRS_MAX_BOX } =
  new Function(src + "\nreturn { srsToday, srsAddDays, srsNewCard, srsGrade, srsQueue, SRS_INTERVALS, SRS_MAX_BOX };")();

let pass = 0, fail = 0;
function eq(label, actual, expected) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { pass++; }
  else { fail++; console.error(`FAIL: ${label}\n  expected ${b}\n  actual   ${a}`); }
}

/* ---- srsToday: 深夜境界（3時までは前日扱い） ---- */
// ローカル時刻で組み立てるので実行マシンのTZに依存しない
eq("today: 深夜2:59は前日", srsToday(new Date(2026, 6, 13, 2, 59).getTime(), 3), "2026-07-12");
eq("today: 3:00ちょうどは当日", srsToday(new Date(2026, 6, 13, 3, 0).getTime(), 3), "2026-07-13");
eq("today: 昼は当日", srsToday(new Date(2026, 6, 13, 12, 0).getTime(), 3), "2026-07-13");
eq("today: 境界0時なら日付そのまま", srsToday(new Date(2026, 6, 13, 0, 30).getTime(), 0), "2026-07-13");
eq("today: 月初の深夜は前月末に戻る", srsToday(new Date(2026, 7, 1, 1, 0).getTime(), 3), "2026-07-31");

/* ---- srsAddDays: 繰り上がり ---- */
eq("addDays: 通常", srsAddDays("2026-07-12", 3), "2026-07-15");
eq("addDays: 月またぎ", srsAddDays("2026-07-31", 1), "2026-08-01");
eq("addDays: 年またぎ", srsAddDays("2026-12-25", 14), "2027-01-08");
eq("addDays: うるう年", srsAddDays("2028-02-28", 1), "2028-02-29");
eq("addDays: 0日", srsAddDays("2026-07-12", 0), "2026-07-12");

/* ---- srsGrade: 状態遷移 ---- */
const T = "2026-07-12";
const fresh = srsNewCard(T);
eq("new card", fresh, { box: 0, due: T, reps: 0, lapses: 0, retired: false });

const c1 = srsGrade(fresh, true, T);
eq("初回正解 → box1・翌日", { box: c1.box, due: c1.due, reps: c1.reps, lapses: c1.lapses },
  { box: 1, due: "2026-07-13", reps: 1, lapses: 0 });

const w1 = srsGrade(fresh, false, T);
eq("初回不正解 → box0・今日再出題・lapses1", { box: w1.box, due: w1.due, reps: w1.reps, lapses: w1.lapses },
  { box: 0, due: T, reps: 1, lapses: 1 });

// 正解を重ねてbox上限まで: 間隔は 1,3,7,14,30
let c = srsNewCard(T);
const expectedDues = ["2026-07-13", "2026-07-15", "2026-07-19", "2026-07-26", "2026-08-11"];
for (let i = 0; i < 5; i++) {
  c = srsGrade(c, true, T);
  eq(`連続正解${i + 1}回目 → box${i + 1}`, { box: c.box, due: c.due }, { box: i + 1, due: expectedDues[i] });
}
c = srsGrade(c, true, T);
eq("box上限で頭打ち", { box: c.box, due: c.due }, { box: SRS_MAX_BOX, due: "2026-08-11" });

const dropped = srsGrade(c, false, T);
eq("上限からの不正解 → box0に戻る", { box: dropped.box, due: dropped.due, lapses: dropped.lapses },
  { box: 0, due: T, lapses: 1 });

eq("retiredフラグはgradeで保存される",
  srsGrade({ ...fresh, retired: true }, true, T).retired, true);

/* ---- srsQueue: 抽出と並び ---- */
const qs = [
  { id: "future", srs: { box: 2, due: "2026-07-20", reps: 2, lapses: 0, retired: false } },
  { id: "due-today", srs: { box: 1, due: T, reps: 1, lapses: 0, retired: false } },
  { id: "overdue-weak", srs: { box: 0, due: "2026-07-10", reps: 4, lapses: 3, retired: false } },
  { id: "retired", srs: { box: 0, due: T, reps: 1, lapses: 5, retired: true } },
  { id: "overdue", srs: { box: 1, due: "2026-07-11", reps: 1, lapses: 1, retired: false } },
];
eq("queue: 期限内のみ・retired除外・苦手(lapses多)優先",
  srsQueue(qs, T).map(q => q.id), ["overdue-weak", "overdue", "due-today"]);
eq("queue: 空入力", srsQueue([], T), []);
eq("queue: 全部future", srsQueue([qs[0]], T), []);

/* ---- 定数の整合 ---- */
eq("間隔テーブルはbox数と一致", SRS_INTERVALS.length, SRS_MAX_BOX + 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
