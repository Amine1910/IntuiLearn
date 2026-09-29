import { describe, expect, it } from 'vitest';
import { gradeQuiz, progressPercent } from '../lib/study';
import { guardView } from '../App';
describe('study results', () => {
 it('does not grade an unanswered question as correct', () => {
  expect(gradeQuiz([{id:'1',question:'Q',options:['A'],correctAnswer:0,explanation:'E',type:'Multiple Choice'}],{}).correct).toBe(0);
 });
 it('normalizes fill-in-the-blank whitespace and case', () => {
  expect(gradeQuiz([{id:'1',question:'Q',options:[],correctAnswer:' Message queue ',explanation:'E',type:'Fill in the Blank'}],{'1':'message QUEUE'}).correct).toBe(1);
 });
 it('grades multiple-choice and true-or-false answers by option index', () => {
  const questions=[
   {id:'1',question:'Q1',options:['A','B','C','D'],correctAnswer:2,explanation:'E',type:'Multiple Choice'},
   {id:'2',question:'Q2',options:['True','False'],correctAnswer:1,explanation:'E',type:'True/False'},
  ];
  expect(gradeQuiz(questions,{'1':2,'2':1})).toEqual({correct:2,total:2,score:100});
 });
 it('uses actual completion and handles an empty course', () => {
  expect(progressPercent(0,0)).toBe(0); expect(progressPercent(1,3)).toBe(33);
 });
 it('shows a recoverable authentication error before redirecting a missing session', () => {
  expect(guardView({configured:true,loading:false,hasSession:false,error:'Session lookup failed',onboarded:false,onboarding:false})).toBe('error');
 });
});
