# Dockerfile for Solus Protocol SDK
FROM python:3.14-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["pytest"]
