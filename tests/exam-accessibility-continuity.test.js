import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exam = await readFile(new URL('../web/exam.js', import.meta.url), 'utf8');

test('exam exposes current question and timer semantics without announcing every clock tick', () => {
  assert.match(exam, /aria-current=\"true\"/);
  assert.match(exam, /role=\"timer\" aria-live=\"off\" aria-label=\"Section time remaining\"/);
  assert.match(exam, /aria-label=\"Question navigation\"/);
  assert.match(exam, /aria-hidden=\"true\"/);
});

test('question changes restore keyboard and screen-reader context to the new stem', () => {
  assert.match(exam, /<legend id=\"exam-question-stem\" tabindex=\"-1\">/);
  assert.match(exam, /function restoreFocus\(/);
  assert.match(exam, /target\.focus\(\{ preventScroll:true \}\)/);
  assert.match(exam, /render\(\{ focusQuestion:true \}\)/);
  assert.match(exam, /render\(\{ focusQuestion:sectionChanged \}\)/);
});

test('answer and review saves restore a meaningful control after rerender', () => {
  assert.match(exam, /render\(optionId === null \? \{ focusQuestion:true \} : \{ focusOptionId:optionId \}\)/);
  assert.match(exam, /render\(\{ focusAction:'toggle-review' \}\)/);
  assert.match(exam, /input\[name=\"exam-answer\"\]/);
  assert.match(exam, /status\.join\(', '\)/);
});
