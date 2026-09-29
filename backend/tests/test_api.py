import pytest
from app import create_app
from contracts import APIError

class FakeServices:
    def authenticate(self, token):
        if token != 'valid': raise APIError('Sign in again.', 'unauthorized', 401)
        return {'stud_id': 7}
    def course(self, token, user, name):
        if name != 'Distributed_Systems': raise APIError('Not enrolled.', 'forbidden', 403)
        return {'course_id': 1, 'course_name': name}
    def ask(self, token, user, course, question, chapter):
        return {'answer': 'A queue decouples producers and consumers.', 'sources': []}
    def quiz(self, token, course, payload):
        return {'questions': []}

@pytest.fixture
def client():
    return create_app(FakeServices()).test_client()

def test_no_auth_cannot_ask(client):
    r=client.post('/api/ask',json={'userId': 7,'courseName':'Distributed_Systems','question':'Queue?'})
    assert r.status_code == 401
    assert r.json['code'] == 'unauthorized'

def test_caller_cannot_select_other_course(client):
    r=client.post('/api/ask',headers={'Authorization':'Bearer valid'},json={'courseName':'Private','question':'Queue?'})
    assert r.status_code == 403

def test_ask_accepts_verified_user(client):
    r=client.post('/api/ask',headers={'Authorization':'Bearer valid'},json={'userId':999,'courseName':'Distributed_Systems','question':'Queue?'})
    assert r.status_code == 200
    assert 'queue' in r.json['answer']

@pytest.mark.parametrize('body',[None,[],{}, {'question':' ','courseName':'Distributed_Systems'}])
def test_bad_bodies_are_client_errors(client,body):
    r=client.post('/api/ask',headers={'Authorization':'Bearer valid'},json=body)
    assert r.status_code == 400

def test_health_does_not_require_provider_or_auth(client):
    assert client.get('/api/health').status_code == 200
