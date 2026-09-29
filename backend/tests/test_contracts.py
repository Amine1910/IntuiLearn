import pytest
from contracts import APIError, validate_quiz, safe_material_path


def test_quiz_rejects_invalid_answer_index():
    with pytest.raises(APIError):
        validate_quiz([dict(question='Which?', options=['A', 'B'], correctAnswer=9, explanation='Because')], 1, 'True/False')


def test_fill_blank_requires_text_answer():
    with pytest.raises(APIError):
        validate_quiz([dict(question='A __', correctAnswer=0, explanation='Because')], 1, 'Fill in the Blank')
    result = validate_quiz([dict(question='A __', correctAnswer='queue', explanation='Because')], 1, 'Fill in the Blank')
    assert result[0]['correctAnswer'] == 'queue'


def test_empty_and_partial_quizzes_are_errors():
    with pytest.raises(APIError):
        validate_quiz([], 5, 'Multiple Choice')


@pytest.mark.parametrize(('kind', 'options', 'answer'), [
    ('Multiple Choice', ['Queue', 'Stack', 'Tree', 'Graph'], 0),
    ('True/False', ['True', 'False'], 1),
    ('Fill in the Blank', [], 'idempotent'),
])
def test_every_supported_quiz_type_has_a_valid_contract(kind, options, answer):
    result = validate_quiz([dict(
        question='Choose the grounded answer.', options=options,
        correctAnswer=answer, explanation='The course material supports it.',
    )], 1, kind)
    assert result[0]['type'] == kind
    assert result[0]['correctAnswer'] == answer


def test_material_path_cannot_escape_root(tmp_path):
    with pytest.raises(APIError):
        safe_material_path(tmp_path, '../private.txt')
    private = tmp_path.parent / 'private.txt'
    private.write_text('private')
    (tmp_path / 'link.txt').symlink_to(private)
    with pytest.raises(APIError):
        safe_material_path(tmp_path, 'link.txt')
    material = tmp_path / 'chapter.txt'
    material.write_text('hello')
    assert safe_material_path(tmp_path, 'chapter.txt') == material
