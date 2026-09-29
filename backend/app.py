from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from contracts import APIError, text_field
from config import Settings
from services import Services


def create_app(services=None):
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 32 * 1024
    settings = Settings()
    CORS(app, origins=settings.origins, allow_headers=['Content-Type', 'Authorization'])
    service = services or Services(settings)

    @app.errorhandler(APIError)
    def expected_error(error):
        return jsonify(error=str(error), code=error.code), error.status

    @app.errorhandler(Exception)
    def unexpected_error(error):
        if isinstance(error, HTTPException):
            return jsonify(error=error.description, code='invalid_request'), error.code
        # Do not log exception messages that may include prompts or credentials.
        app.logger.error('Request failed: %s', type(error).__name__)
        return jsonify(error='Something went wrong. Please try again.', code='internal_error'), 500

    def auth():
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer ') or not header[7:].strip():
            raise APIError('Please sign in to continue.', 'unauthorized', 401)
        token = header[7:]
        return token, service.authenticate(token)

    def body():
        value = request.get_json(silent=True)
        if not isinstance(value, dict): raise APIError('A JSON object is required.')
        return value

    @app.get('/api/health')
    def health():
        return jsonify(status='running', database_configured=bool(settings.url and settings.anon), ai_configured=bool(settings.gemini_key or settings.demo_ai), demo_ai=settings.demo_ai)

    @app.post('/api/ask')
    def ask():
        token, user = auth()
        data = body()
        name, question = text_field(data, 'courseName', 150), text_field(data, 'question')
        chapter = text_field(data, 'chapter', 200, optional=True)
        course = service.course(token, user, name)
        return jsonify(service.ask(token, user, course, question, chapter))

    @app.post('/api/generate-quiz')
    def quiz():
        token, user = auth()
        data = body()
        name = text_field(data, 'courseName', 150)
        count = data.get('numQuestions', 5)
        if type(count) is not int or not 1 <= count <= 10: raise APIError('Choose between 1 and 10 questions.')
        kind = data.get('questionType', 'Multiple Choice')
        difficulty = data.get('difficulty', 'Medium')
        if kind not in ['Multiple Choice', 'True/False', 'Fill in the Blank'] or difficulty not in ['Easy', 'Medium', 'Hard']:
            raise APIError('Choose a supported question type and difficulty.')
        payload = dict(numQuestions=count, questionType=kind, difficulty=difficulty,
            topic=text_field(data, 'topic', 300, optional=True), chapter=text_field(data, 'chapter', 200, optional=True))
        course = service.course(token, user, name)
        return jsonify(service.quiz(token, course, payload))

    @app.get('/api/courses/<name>/materials')
    def materials(name):
        token, user = auth()
        return jsonify(materials=service.materials(service.course(token, user, name)))

    @app.get('/api/courses/<name>/materials/<material_id>')
    def content(name, material_id):
        token, user = auth()
        path, pdf = service.material(service.course(token, user, name), material_id)
        response = send_file(path, mimetype='application/pdf' if pdf else 'text/plain; charset=utf-8')
        response.headers['Cache-Control'] = 'private, no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    return app


if __name__ == '__main__':
    create_app().run(host='127.0.0.1', port=5000)
