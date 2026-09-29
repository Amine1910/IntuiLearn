import json
import pytest
from FINAL_PROCESSING import extract_text, build_chunks, publish_local
from contracts import APIError


def test_empty_file_is_rejected(tmp_path):
    f=tmp_path/'empty.md';f.write_text('  ')
    with pytest.raises(APIError): extract_text(f)


def test_clean_chunking_preserves_source_and_stable_ids(tmp_path):
    f=tmp_path/'Notes.md';f.write_text('# Queues\n\n'+('A queue decouples a producer and a consumer. '*80))
    docs=[{'id':'abc','name':f.name,'chapter':'Queues','type':'chapter','text':extract_text(f)}]
    first=build_chunks(docs, None)
    assert len(first)>1
    assert first==build_chunks(docs, None)
    assert all(c['material_id']=='abc' and len(c['chunk_text'])<=800 for c in first)


def test_atomic_publish_retains_last_good_version(tmp_path):
    old=tmp_path/'old';old.mkdir();(old/'manifest.json').write_text('{}')
    (tmp_path/'current.json').write_text('{"version":"old"}')
    new=tmp_path/'new';new.mkdir()
    with pytest.raises(APIError): publish_local(tmp_path,new)
    assert json.loads((tmp_path/'current.json').read_text())['version']=='old'
    (new/'manifest.json').write_text('{}')
    publish_local(tmp_path,new)
    assert json.loads((tmp_path/'current.json').read_text())['version']=='new'
