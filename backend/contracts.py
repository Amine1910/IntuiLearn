"""Small, dependency-free validation shared by HTTP and ingestion boundaries."""
from pathlib import Path


class APIError(Exception):
    def __init__(self, message, code='invalid_request', status=400):
        super().__init__(message)
        self.code, self.status = code, status


def text_field(data, key, maximum=4000, optional=False):
    value = data.get(key, '')
    if not isinstance(value, str) or len(value) > maximum or (not optional and not value.strip()):
        raise APIError(f'A valid {key} is required.')
    return value.strip()


def safe_material_path(root, relative):
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise APIError('Material is unavailable.', 'material_unavailable', 404)
    return path


def validate_quiz(questions, count, kind):
    def invalid():
        raise APIError('The generated quiz was incomplete. Please try again.', 'invalid_generation', 502)
    if not isinstance(questions, list) or len(questions) != count:
        invalid()
    result = []
    for index, q in enumerate(questions):
        if not isinstance(q, dict) or not all(isinstance(q.get(k), str) and q[k].strip() for k in ['question', 'explanation']):
            invalid()
        answer = q.get('correctAnswer')
        options = q.get('options', [])
        if kind == 'Fill in the Blank':
            if not isinstance(answer, str) or not answer.strip(): invalid()
            options = []
        else:
            size = 2 if kind == 'True/False' else 4
            if not isinstance(options, list) or len(options) != size or not all(isinstance(o, str) and o.strip() for o in options): invalid()
            if kind == 'True/False' and options != ['True', 'False']: invalid()
            if type(answer) is not int or not 0 <= answer < len(options): invalid()
        result.append(dict(id=str(index+1), question=q['question'], explanation=q['explanation'], options=options, correctAnswer=answer, type=kind))
    return result
