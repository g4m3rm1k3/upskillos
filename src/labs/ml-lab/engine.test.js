import { describe, it, expect } from 'vitest'
import { generateData, splitData, mse, gradients, gradientCheck, closedForm, initialModel, stepModel, parseCSV } from './engine.js'
import { lessons } from './lessons.js'

describe('regression mathematics and experiment integrity', () => {
  it('matches hand-calculated loss, derivatives and a simultaneous update', () => {
    const data=[{x:2,y:5}]
    expect(mse(data,1,0)).toBe(9)
    expect(gradients(data,1,0)).toEqual({w:-12,b:-6})
    const result=stepModel(initialModel(data,data,1,0),data,data,0.1)
    expect(result.w).toBeCloseTo(2.2,12)
    expect(result.b).toBeCloseTo(0.6,12)
    expect(result.history.at(-1).train).toBeCloseTo(0,12)
    expect(result.last.g).toEqual({w:-12,b:-6})
  })
  it('matches independently calculated finite differences away from the optimum', () => {
    for(const seed of [1,42,812]) {
      const data=generateData({seed})
      expect(gradientCheck(data,0.73,-1.2).passed).toBe(true)
    }
  })
  it('converges to a known noisy-data least-squares result', () => {
    // x has zero mean. The residual [1,-2,1] is orthogonal to x and to the intercept.
    const data=[{x:-1,y:0},{x:0,y:-1},{x:1,y:4}]
    const ref=closedForm(data)
    expect(ref.w).toBeCloseTo(2,12);expect(ref.b).toBeCloseTo(1,12)
    let model=initialModel(data,data)
    for(let i=0;i<500;i++)model=stepModel(model,data,data,0.1)
    expect(model.w).toBeCloseTo(ref.w,8);expect(model.b).toBeCloseTo(ref.b,8)
    expect(mse(data,model.w,model.b)).toBeCloseTo(2,8)
    expect(model.history).toHaveLength(501)
  })
  it('does not use validation targets to fit parameters', () => {
    const {train,validation}=splitData(generateData())
    const poisoned=validation.map(p=>({...p,y:p.y+50}))
    const a=stepModel(initialModel(train,validation),train,validation,.05)
    const b=stepModel(initialModel(train,poisoned),train,poisoned,.05)
    expect(a.w).toBe(b.w);expect(a.b).toBe(b.b)
    expect(a.history.at(-1).validation).not.toBe(b.history.at(-1).validation)
  })
  it('generates reproducible data and a nonoverlapping complete split', () => {
    const data=generateData({seed:42})
    expect(data).toEqual(generateData({seed:42}))
    expect(data).not.toEqual(generateData({seed:43}))
    const split=splitData(data,42)
    expect(split).toEqual(splitData(data,42))
    expect(split.train).toHaveLength(48);expect(split.validation).toHaveLength(12)
    expect(new Set([...split.train,...split.validation]).size).toBe(data.length)
    expect(split.train.some(p=>split.validation.includes(p))).toBe(false)
  })
  it('handles constant inputs with a mean prediction and reports nonidentifiability', () => {
    expect(closedForm([{x:2,y:1},{x:2,y:3}])).toEqual({w:0,b:2,degenerate:true})
  })
  it('halts divergence while retaining finite inspectable history', () => {
    const data=generateData()
    let model=initialModel(data,data)
    for(let i=0;i<100;i++)model=stepModel(model,data,data,1)
    expect(model.stopped).toMatch(/diverged/)
    expect(model.history.every(p=>Number.isFinite(p.train))).toBe(true)
    expect(stepModel(model,data,data,1)).toBe(model)
  })
  it('rejects missing, malformed, excessive or nonfinite CSV values', () => {
    expect(parseCSV('x,y\n1,2\n2,3\n3,4\n4,5\n5,6')).toHaveLength(5)
    for(const bad of ['1,2\n2,3','x,y\n,2\n2,3\n3,4\n4,5\n5,6','x,y\nNaN,2\n2,3\n3,4\n4,5\n5,6','x,y\nInfinity,2\n2,3\n3,4\n4,5\n5,6'])expect(()=>parseCSV(bad)).toThrow()
  })
  it('gives each lesson a prerequisite, transfer reflection and numeric check', () => {
    expect(new Set(lessons.map(l=>l.id)).size).toBe(lessons.length)
    for(const l of lessons) {expect(l.prerequisite.length).toBeGreaterThan(10);expect(l.reflection.length).toBeGreaterThan(20);expect(Number.isFinite(l.answer)).toBe(true)}
  })
})
