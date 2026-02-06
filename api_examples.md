# Solus Protocol API Examples

## Anchor Record (Python)
```python
import requests
record = "Patient: John Doe\nDOB: 1985-03-15\nVisit: 2026-01-20\nDiagnosis: Hypertension, mild"
response = requests.post('http://localhost:5000/anchor', json={'record': record})
print(response.json())
```

## Verify Record Hash (Python)
```python
import requests
record = "Patient: John Doe\nDOB: 1985-03-15\nVisit: 2026-01-20\nDiagnosis: Hypertension, mild"
response = requests.post('http://localhost:5000/verify', json={'record': record})
print(response.json())
```

## Audit Log Retrieval (Python)
```python
import requests
response = requests.get('http://localhost:5000/audit')
print(response.json())
```

## Anchor Record (cURL)
```
curl -X POST http://localhost:5000/anchor -H "Content-Type: application/json" -d '{"record": "Patient: John Doe\nDOB: 1985-03-15\nVisit: 2026-01-20\nDiagnosis: Hypertension, mild"}'
```

## Verify Record Hash (cURL)
```
curl -X POST http://localhost:5000/verify -H "Content-Type: application/json" -d '{"record": "Patient: John Doe\nDOB: 1985-03-15\nVisit: 2026-01-20\nDiagnosis: Hypertension, mild"}'
```

## Audit Log Retrieval (cURL)
```
curl http://localhost:5000/audit
```
