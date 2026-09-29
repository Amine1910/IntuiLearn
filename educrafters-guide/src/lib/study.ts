export interface Course { course_id: number; course_code: string; course_name: string; description: string; instructor: string }
export interface Chapter { chapter_id: number; course_id: number; chapter_name: string; chapter_number: number }
export interface Material { id: string; name: string; chapter: string; type: string; format: string }
export interface Source { material_id: string; name: string; chapter: string; type: string }
export interface Message { id?: number; role: 'user' | 'assistant'; content: string; sources?: Source[] }
export interface Question { id: string; question: string; options: string[]; correctAnswer: number | string; explanation: string; type: string }
export type Answers = Record<string, number | string>;
export function isCorrect(q: Question, value: number | string | undefined) {
 if (value === undefined) return false;
 return q.type === 'Fill in the Blank' ? String(value).trim().toLocaleLowerCase() === String(q.correctAnswer).trim().toLocaleLowerCase() : value === q.correctAnswer;
}
export function gradeQuiz(questions: Question[], answers: Answers) {
 const correct = questions.filter(q => isCorrect(q, answers[q.id])).length;
 return {correct, total: questions.length, score: questions.length ? Math.round(correct / questions.length * 100) : 0};
}
export function progressPercent(completed: number, total: number) { return total ? Math.min(100, Math.round(completed / total * 100)) : 0; }
export const courseTitle = (name: string) => name.replace(/_/g, ' ');
export const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
