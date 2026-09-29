from config import Settings
from contracts import validate_quiz
from services import Services


def demo_service():
    settings = Settings()
    settings.demo_ai = True
    return Services(settings)


def test_demo_answer_uses_course_text_without_markdown_headings():
    answer = demo_service().demo_answer([{
        'chunk_text': '# Message queues\n\nA queue separates producing work from processing it.\n\nConsumers work at their own pace.'
    }])
    assert answer.startswith('Based on the course material, A queue')
    assert '#' not in answer


def test_demo_quiz_supports_every_question_type():
    selected = [{'chapter': 'Message queues'}]
    for kind in ('Multiple Choice', 'True/False', 'Fill in the Blank'):
        questions = demo_service().demo_quiz(kind, 3, selected)
        assert len(validate_quiz(questions, 3, kind)) == 3
