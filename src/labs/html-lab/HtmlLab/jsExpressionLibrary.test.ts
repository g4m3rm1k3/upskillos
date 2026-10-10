import { describe, expect, it } from "vitest";
import { parse } from "acorn";
import { detectTemplate, EXPRESSION_LIBRARY } from "./jsExpressionLibrary";

describe("getElementProperty", () => {
  const template = EXPRESSION_LIBRARY.find((t) => t.id === "getElementProperty")!;

  it("exists and is a dom-group template", () => {
    expect(template).toBeTruthy();
    expect(template.group).toBe("dom");
  });

  it("composes object.property from its two params", () => {
    expect(template.build({ object: "document.querySelector('#agree')", property: "checked" }))
      .toBe("document.querySelector('#agree').checked");
  });

  it("supports an already-captured variable as the object, not just a fresh selector lookup", () => {
    expect(template.build({ object: "input", property: "value" })).toBe("input.value");
  });

  it("falls back to sensible defaults when params are blank", () => {
    expect(template.build({})).toBe("element.textContent");
  });

  it("has a domProperty-kind property param, not plain text — the whole point is a picker, not typing", () => {
    const propertyParam = template.params.find((p) => p.name === "property");
    expect(propertyParam?.kind).toBe("domProperty");
  });
});

describe('imported expression recognition', () => {
  const cases = [
    ['"hello"', 'textValue'], ["'it\\'s fine'", 'textValue'], ['-12.5', 'numberValue'],
    ['true', 'booleanValue'], ['count', 'variableValue'],
    ["document.querySelector('#count')", 'querySelector'],
    ["document.getElementById('count')", 'getElementById'],
    ['count > 2', 'cmpGreater'], ['a && (b || c)', 'logicAnd'],
    ['!(a && b)', 'logicNot'], ['Math.round(price)', 'mathRound'],
    ['player.score', 'getProperty'], ['(first || second).name', 'getProperty'], ['load(count, "text")', 'callFn'],
  ];
  for (const [code, id] of cases) it(`recognizes ${code} without changing its meaning`, () => {
    const detected = detectTemplate(code)!;
    expect(detected?.id).toBe(id);
    const regenerated = EXPRESSION_LIBRARY.find(t => t.id === id)!.build(detected.params);
    const ast = (input: string) => JSON.stringify(parse(`(${input})`, {ecmaVersion:'latest'}), (key, value) => ['start','end','raw'].includes(key) ? undefined : value);
    expect(ast(regenerated)).toBe(ast(code));
  });
  it('leaves unsupported and unfinished syntax as code', () => {
    expect(detectTemplate('count +')).toBeNull();
    expect(detectTemplate('items?.[0]')).toBeNull();
  });
});
