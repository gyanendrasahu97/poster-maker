FROM danielgatis/rembg:latest

WORKDIR /app

ENV U2NET_HOME=/app/.u2net

COPY app.py ./

RUN mkdir -p /app/.u2net

EXPOSE 8002

ENTRYPOINT []

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8002/health', timeout=4).read()" || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
